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
 * Показать диалог с полем для пароля (скрытый ввод) в стиле сайта
 * @param {string} message - Сообщение для пользователя
 * @returns {Promise<string|null>} - введённый пароль или null (отмена)
 */
function showPasswordDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top:0; left:0; width:100%; height:100%;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(2px);
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: var(--surface, #ffffff);
      padding: 2rem 2.5rem;
      border-radius: var(--radius, 16px);
      max-width: 420px;
      width: 90%;
      box-shadow: var(--shadow, 0 4px 12px rgba(0,0,0,0.12));
      border: 1px solid var(--border, #e4e4e4);
    `;

    dialog.innerHTML = `
      <p style="margin-top:0; margin-bottom:1.5rem; font-size:1.1rem; color: var(--text, #1e1e1e);">
        ${message}
      </p>
      <input type="password" id="passwordInput" 
             style="width:100%; padding:0.75rem; font-size:1rem; 
                    border:1px solid var(--border, #ccc); border-radius:8px; 
                    box-sizing:border-box; background: var(--bg, #faf9f8); 
                    color: var(--text, #1e1e1e); outline: none; transition: border-color 0.2s;" 
             placeholder="Введите пароль" autofocus>
      <div style="display:flex; gap:0.75rem; margin-top:1.5rem; justify-content:flex-end;">
        <button id="cancelBtn" style="padding:0.6rem 1.5rem; background: var(--bg, #f0f0f0); 
               border: none; border-radius:30px; cursor:pointer; font-size:0.95rem; 
               color: var(--text, #1e1e1e); transition: background 0.15s;">
          Отмена
        </button>
        <button id="okBtn" style="padding:0.6rem 1.5rem; background: var(--primary, #2b3a67); 
               color: white; border: none; border-radius:30px; cursor:pointer; font-size:0.95rem; 
               transition: background 0.15s;">
          OK
        </button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const input = dialog.querySelector('#passwordInput');
    const okBtn = dialog.querySelector('#okBtn');
    const cancelBtn = dialog.querySelector('#cancelBtn');

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    okBtn.addEventListener('click', () => close(input.value));
    cancelBtn.addEventListener('click', () => close(null));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') close(input.value);
      if (e.key === 'Escape') close(null);
    });
    okBtn.addEventListener('mouseenter', () => {
      okBtn.style.background = 'var(--primary-light, #3f5582)';
    });
    okBtn.addEventListener('mouseleave', () => {
      okBtn.style.background = 'var(--primary, #2b3a67)';
    });
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = 'var(--border, #e0e0e0)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = 'var(--bg, #f0f0f0)';
    });
    setTimeout(() => input.focus(), 50);
    input.addEventListener('focus', () => {
      input.style.borderColor = 'var(--primary, #2b3a67)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = 'var(--border, #ccc)';
    });
  });
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

    const password = await showPasswordDialog('Введите пароль для доступа к PDF:');
    if (password === null) return; // отмена

    const decryptedData = await decryptProtectedData(encryptedBuffer, password);
    const blob = new Blob([decryptedData], { type: 'application/pdf' });
    let url = URL.createObjectURL(blob);
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

async function loadData() {
  try {
    const response = await fetch('data.json');
    data = await response.json();
    handleRouting();
  } catch (error) {
    contentEl.innerHTML = '<div class="loading">Ошибка загрузки данных</div>';
    console.error(error);
  }
}

function handleRouting() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(p => p);

  if (parts.length === 0) {
    currentView = { type: 'home' };
    renderHome();
  } else if (parts[0] === 'sem' && parts.length === 2) {
    const semesterIndex = parseInt(parts[1]) - 1;
    if (data && data.semesters[semesterIndex]) {
      currentView = { type: 'semester', semesterIndex };
      renderSemester(semesterIndex);
    } else {
      notFound();
    }
  } else if (parts[0] === 'sem' && parts.length === 3) {
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

function renderSemester(semesterIndex) {
  const sem = data.semesters[semesterIndex];
  let html = `<h1>📘 ${sem.name}</h1>`;
  html += `<p class="date">${sem.date}</p>`;
  html += `<p style="margin-bottom: 2rem;">${sem.description}</p>`;
  html += '<h2>Предметы</h2>';
  html += '<div class="subject-grid">';
  sem.subjects.forEach((subject, idx) => {
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

  const reportUrl = `report.html?semesterIndex=${semesterIndex}&subjectIndex=${subjectIndex}`;

  html += `<div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">`;
  if (subject.protected) {
    html += `<a href="#" class="pdf-btn-large" onclick="openProtectedPDF(${semesterIndex}, ${subjectIndex}, null); return false;">📥 Скачать PDF</a>`;
  } else {
    html += `<a href="pdf/sem${semesterIndex+1}/${subject.folderName}.pdf" class="pdf-btn-large" target="_blank">📥 Скачать PDF</a>`;
  }
  html += `<a href="${reportUrl}" class="bug-btn-large" target="_blank">🐛 Сообщить об ошибке</a>`;
  html += `</div>`;

  if (subject.protected) {
    html += `
      <div style="margin-top: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #ff9800;">
        <span style="font-size: 1.2rem;">🔒</span> 
        <span style="font-weight: 500;">Данный PDF-файл защищён паролем.</span> 
        <span style="color: #666;">При клике на ссылку вам будет предложено ввести пароль для доступа к содержимому.</span>
      </div>
    `;
  }

  html += '<h2>Лекции</h2>';
  html += '<div class="lecture-list">';
  subject.lectures.forEach((lecture) => {
    const isMissing = lecture.missing || false;
    let lectureHtml;
    if (isMissing) {
      lectureHtml = `<span style="color: #999;">${lecture.name}</span>`;
    } else {
      if (subject.protected) {
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
  navBar.innerHTML += `<a href="tic-tac-toe.html">🎮 Игра</a>`;
}

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

window.addEventListener('hashchange', handleRouting);
loadData();