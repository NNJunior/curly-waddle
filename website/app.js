// Состояние приложения
let data = null;
let currentView = { type: 'home', semesterId: null, subjectId: null };
const GITHUB_REPO = 'https://github.com/NNJunior/curly-waddle';

// Элементы DOM
const navBar = document.getElementById('nav-bar');
const breadcrumbsEl = document.getElementById('breadcrumbs');
const contentEl = document.getElementById('content');

// ------------------------------------------------------------
// Функции для расшифровки protected PDF (AES-GCM + PBKDF2)
// ------------------------------------------------------------

/**
 * Получение ключа AES-256 из пароля и соли (PBKDF2)
 */
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['decrypt']
  );
}

/**
 * Расшифровка данных, зашифрованных Python-скриптом.
 * Формат: [salt (16)] [nonce (12)] [ciphertext + auth tag]
 */
async function decryptProtectedData(encryptedData, password) {
  const data = new Uint8Array(encryptedData);
  const salt = data.slice(0, 16);
  const nonce = data.slice(16, 28);
  const ciphertext = data.slice(28);
  const key = await deriveKey(password, salt);
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce },
      key,
      ciphertext
    );
    return decrypted; // ArrayBuffer
  } catch (e) {
    throw new Error('Неверный пароль или файл повреждён');
  }
}

/**
 * Открыть защищённый PDF: запросить пароль, загрузить, расшифровать, показать.
 * @param {number} semesterIndex - индекс семестра
 * @param {number} subjectIndex  - индекс предмета
 * @param {string|null} anchor   - суффикс лекции для якоря (например, "1_1")
 */
async function openProtectedPDF(semesterIndex, subjectIndex, anchor) {
  const subject = data.semesters[semesterIndex].subjects[subjectIndex];
  const pdfPath = `pdf/sem${semesterIndex+1}/${subject.folderName}.pdf`;
  try {
    const response = await fetch(pdfPath);
    if (!response.ok) throw new Error('Не удалось загрузить PDF');
    const encryptedBuffer = await response.arrayBuffer();

    const password = prompt('Введите пароль для доступа к PDF:');
    if (password === null) return; // отмена

    const decryptedData = await decryptProtectedData(encryptedBuffer, password);
    const blob = new Blob([decryptedData], { type: 'application/pdf' });
    let url = URL.createObjectURL(blob);
    // Если передан якорь, добавляем его к URL (для blob-URL он не работает,
    // но сохраняем единообразие с обычными PDF)
    if (anchor) {
      url += '#nameddest=lecture_' + anchor;
    }
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
}

// ------------------------------------------------------------
// Основной функционал (загрузка, маршрутизация, рендер)
// ------------------------------------------------------------

// Загрузка данных при старте
async function loadData() {
  try {
    const response = await fetch('data.json');
    data = await response.json();
    // Парсим URL для начальной навигации
    handleRouting();
  } catch (error) {
    contentEl.innerHTML = '<div class="loading">Ошибка загрузки данных</div>';
    console.error(error);
  }
}

// Простая маршрутизация на основе hash
function handleRouting() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(p => p);

  if (parts.length === 0) {
    // Главная
    currentView = { type: 'home' };
    renderHome();
  } else if (parts[0] === 'sem' && parts.length === 2) {
    // Страница семестра: #sem/1
    const semesterIndex = parseInt(parts[1]) - 1;
    if (data && data.semesters[semesterIndex]) {
      currentView = { type: 'semester', semesterIndex };
      renderSemester(semesterIndex);
    } else {
      notFound();
    }
  } else if (parts[0] === 'sem' && parts.length === 3) {
    // Страница предмета: #sem/1/subject/0
    const semesterIndex = parseInt(parts[1]) - 1;
    const subjectIndex = parseInt(parts[2]);
    if (data && data.semesters[semesterIndex] && data.semesters[semesterIndex].subjects[subjectIndex]) {
      currentView = { type: 'subject', semesterIndex, subjectIndex };
      renderSubject(semesterIndex, subjectIndex);
    } else {
      notFound();
    }
  } else {
    notFound();
  }

  updateNavBar();
  updateBreadcrumbs();
}

// Рендер главной страницы
function renderHome() {
  let html = '<h1>📚 ' + data.name + '</h1>';
  html += '<p style="margin-bottom: 2rem;">' + data.description + '</p>';
  html += '<h2>Семестры</h2>';
  html += '<div class="semester-grid">';

  data.semesters.forEach((sem, index) => {
    html += `
      <a href="#sem/${index+1}" class="card">
        <h3>${sem.name}</h3>
        <div class="date">${sem.date}</div>
        <div class="description">${sem.description}</div>
      </a>
    `;
  });

  html += '</div>';
  contentEl.innerHTML = html;
}

// Рендер страницы семестра
function renderSemester(semesterIndex) {
  const sem = data.semesters[semesterIndex];
  let html = `<h1>📘 ${sem.name}</h1>`;
  html += `<p class="date">${sem.date}</p>`;
  html += `<p style="margin-bottom: 2rem;">${sem.description}</p>`;
  html += '<h2>Предметы</h2>';
  html += '<div class="subject-grid">';

  sem.subjects.forEach((subject, idx) => {
    // Добавляем значок замка, если предмет защищён
    const lockIcon = subject.protected ? '🔒 ' : '';
    const protectedBadge = subject.protected ? 
      '<div style="font-size: 0.85rem; color: #ff9800; margin-top: 0.5rem;">🔒 Защищён паролем</div>' : '';
    
    html += `
      <a href="#sem/${semesterIndex+1}/${idx}" class="card">
        <h3>${lockIcon}${subject.name}</h3>
        <div class="description">${subject.description}</div>
        ${protectedBadge}
      </a>
    `;
  });

  html += '</div>';
  contentEl.innerHTML = html;
}

function renderSubject(semesterIndex, subjectIndex) {
  const sem = data.semesters[semesterIndex];
  const subject = sem.subjects[subjectIndex];
  let html = `<h1>📐 ${subject.name}</h1>`;
  html += `<p class="date">${sem.name} · ${sem.date}</p>`;
  html += `<div class="description" style="margin-bottom: 2rem;">${subject.description}</div>`;

  // Кнопки PDF и "Нашел ошибку"
  const reportUrl = `report.html?semesterIndex=${semesterIndex}&subjectIndex=${subjectIndex}`;

  html += `<div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">`;

  if (subject.protected) {
    // Защищённый PDF – открываем через функцию (без якоря)
    html += `<a href="#" class="pdf-btn-large" onclick="openProtectedPDF(${semesterIndex}, ${subjectIndex}, null); return false;">📥 Скачать PDF</a>`;
  } else {
    // Обычный PDF – прямая ссылка
    html += `<a href="pdf/sem${semesterIndex+1}/${subject.folderName}.pdf" class="pdf-btn-large" target="_blank">📥 Скачать PDF</a>`;
  }

  html += `<a href="${reportUrl}" class="bug-btn-large" target="_blank">🐛 Сообщить об ошибке</a>`;
  html += `</div>`;

  // ---- Добавляем подпись о защите паролем, если protected === true ----
  if (subject.protected) {
    html += `
      <div style="margin-top: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #ff9800;">
        <span style="font-size: 1.2rem;">🔒</span> 
        <span style="font-weight: 500;">Данный PDF-файл защищён паролем.</span> 
        <span style="color: #666;">При клике на ссылку вам будет предложено ввести пароль для доступа к содержимому.</span>
      </div>
    `;
  }

  // Список лекций
  html += '<h2>Лекции</h2>';
  html += '<div class="lecture-list">';


  subject.lectures.forEach((lecture, idx) => {
    const isMissing = lecture.missing || false;
    let lectureHtml;

    if (isMissing) {
      lectureHtml = `<span style="color: #999;">${lecture.name}</span>`;
    } else {
      if (subject.protected) {
        // Для защищённого – передаём суффикс для якоря (если есть)
        const anchor = lecture.suffix || '';
        lectureHtml = `<a href="#" onclick="openProtectedPDF(${semesterIndex}, ${subjectIndex}, '${anchor}'); return false;">${lecture.name}</a>`;
      } else {
        let pdfLink = `pdf/sem${semesterIndex+1}/${subject.folderName}.pdf`;
        if (lecture.suffix) {
          pdfLink += `#nameddest=lecture_${lecture.suffix}`;
        }
        lectureHtml = `<a href="${pdfLink}" target="_blank">${lecture.name}</a>`;
      }
    }

    html += `
      <div class="lecture-item">
        <div class="lecture-name">${lectureHtml}</div>
        <div class="lecture-date">${lecture.date}</div>
        <div class="lecture-desc">${lecture.desc || ''}</div>
        ${isMissing ? '<div class="meta">✏️ Конспект отсутствует</div>' : ''}
      </div>
    `;
  });

  html += '</div>';

  html += `<a href="#sem/${semesterIndex+1}" class="back-link">← Все предметы семестра</a>`;
  contentEl.innerHTML = html;
}

function notFound() {
  contentEl.innerHTML = '<h1>404</h1><p>Страница не найдена</p><a href="#/">На главную</a>';
}

// Обновление навигационной панели (подсветка текущего раздела)
function updateNavBar() {
  const links = [
    { name: '🏠 Главная', hash: '#/' },
    ...data.semesters.map((sem, idx) => ({ name: sem.name, hash: `#sem/${idx+1}` }))
  ];

  navBar.innerHTML = links.map(link => {
    const active = (currentView.type === 'home' && link.hash === '#/') ||
                   (currentView.type === 'semester' && link.hash === `#sem/${currentView.semesterIndex+1}`) ||
                   (currentView.type === 'subject' && link.hash === `#sem/${currentView.semesterIndex+1}`);
    return `<a href="${link.hash}" ${active ? 'style="background: var(--primary); color: white;"' : ''}>${link.name}</a>`;
  }).join('');

  // Добавляем ссылку на игру (если есть)
  navBar.innerHTML += `<a href="tic-tac-toe.html">🎮 Игра</a>`;
}

// Обновление хлебных крошек
function updateBreadcrumbs() {
  let html = '<a href="#/">Главная</a>';
  if (currentView.type === 'semester' || currentView.type === 'subject') {
    const sem = data.semesters[currentView.semesterIndex];
    html += ` / <a href="#sem/${currentView.semesterIndex+1}">${sem.name}</a>`;
  }
  if (currentView.type === 'subject') {
    const subj = data.semesters[currentView.semesterIndex].subjects[currentView.subjectIndex];
    html += ` / ${subj.name}`;
  }
  breadcrumbsEl.innerHTML = html;
}

// Слушаем изменения hash
window.addEventListener('hashchange', handleRouting);

// Старт
loadData();