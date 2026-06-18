// Состояние приложения
let data = null;
let currentView = { type: 'home', semesterId: null, subjectId: null };
const GITHUB_REPO = 'https://github.com/NNJunior/curly-waddle';

// Элементы DOM
const navBar = document.getElementById('nav-bar');
const breadcrumbsEl = document.getElementById('breadcrumbs');
const contentEl = document.getElementById('content');

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
    html += `
      <a href="#sem/${semesterIndex+1}/${idx}" class="card">
        <h3>${subject.name}</h3>
        <div class="description">${subject.description}</div>
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

  // // Кнопки PDF и "Нашел ошибку" в ряд
  // const issueTitle = encodeURIComponent(`Ошибка в конспекте по предмету "${subject.name}"`);
  // const issueBody = encodeURIComponent(
  //   `Семестр: ${sem.name}\n` +
  //   `Предмет: ${subject.name}\n` +
  //   `Описание ошибки:\n\n` +
  //   `(подробно опишите, что не так)`
  // );
  // Если хотите передавать номер страницы (из PDF), можно добавить &page=..., но на сайте его нет – оставляем как есть.
  const reportUrl = `report.html?semesterIndex=${semesterIndex}&subjectIndex=${subjectIndex}`;

  html += `<div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">`;
  html += `<a href="pdf/sem${semesterIndex+1}/${subject.pdfName}" class="pdf-btn-large" target="_blank">📥 Скачать PDF</a>`;
  html += `<a href="${reportUrl}" class="bug-btn-large" target="_blank" class="report-error-btn">🐛 Сообщить об ошибке</a>`;
  html += `</div>`;

  html += '<h2>Лекции</h2>';
  html += '<div class="lecture-list">';

  subject.lectures.forEach((lecture, idx) => {
    let pdfLink = `pdf/sem${semesterIndex+1}/${subject.pdfName}`;
    if (lecture.suffix) {
      pdfLink += `#nameddest=lecture_${lecture.suffix}`;
    }
    const missingText = lecture.missing ? '<div class="meta">✏️ Конспект отсутствует</div>' : '';
    html += `
      <div class="lecture-item">
        <div class="lecture-name">
          <a href="${pdfLink}" target="_blank">${lecture.name}</a>
        </div>
        <div class="lecture-date">${lecture.date}</div>
        <div class="lecture-desc">${lecture.desc || ''}</div>
        ${missingText}
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