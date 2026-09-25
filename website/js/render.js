// Рендеринг страниц.

import { state, contentEl } from './state.js';
import { escapeHtml } from './utils.js';
import { getSubjectId, loadPassword, forgetPassword } from './storage.js';
import { verifyPasswordHash } from './hash.js';

export function renderHome() {
  const data = state.data;
  let html = '<h1>📚 ' + escapeHtml(data.name) + '</h1>';
  html += '<p style="margin-bottom: 2rem;">' + escapeHtml(data.description) + '</p>';
  html += '<h2>Семестры</h2>';
  html += '<div class="semester-grid">';

  data.semesters.forEach((sem, index) => {
    html += `
      <a href="#sem/${index + 1}" class="card">
        <h3>${escapeHtml(sem.name)}</h3>
        <div class="date">${escapeHtml(sem.date)}</div>
        <div class="description">${escapeHtml(sem.description)}</div>
      </a>
    `;
  });

  html += '</div>';
  contentEl.innerHTML = html;
}

export function renderSemester(semesterIndex) {
  const sem = state.data.semesters[semesterIndex];
  let html = `<h1>📘 ${escapeHtml(sem.name)}</h1>`;
  html += `<p class="date">${escapeHtml(sem.date)}</p>`;
  html += `<p style="margin-bottom: 2rem;">${escapeHtml(sem.description)}</p>`;
  html += '<h2>Предметы</h2>';
  html += '<div class="subject-grid">';

  sem.subjects.forEach((subject, idx) => {
    const isProtected = !!subject.passwordHash;
    const lockIcon = isProtected ? '🔒 ' : '';
    const protectedBadge = isProtected
      ? '<div style="font-size: 0.85rem; color: #ff9800; margin-top: 0.5rem;">🔒 Защищён паролем</div>'
      : '';
    html += `
      <a href="#sem/${semesterIndex + 1}/${idx}" class="card">
        <h3>${lockIcon}${escapeHtml(subject.name)}</h3>
        <div class="description">${escapeHtml(subject.description)}</div>
        ${protectedBadge}
      </a>
    `;
  });

  html += '</div>';
  contentEl.innerHTML = html;
}

export async function renderSubject(semesterIndex, subjectIndex) {
  const sem = state.data.semesters[semesterIndex];
  const subject = sem.subjects[subjectIndex];
  const subjectId = getSubjectId(semesterIndex, subject);
  const isProtected = !!subject.passwordHash;

  let html = `<h1>📐 ${escapeHtml(subject.name)}</h1>`;
  html += `<p class="date">${escapeHtml(sem.name)} · ${escapeHtml(sem.date)}</p>`;
  html += `<div class="description" style="margin-bottom: 2rem;">${escapeHtml(subject.description)}</div>`;

  const reportUrl = `report.html?semesterIndex=${semesterIndex}&subjectIndex=${subjectIndex}`;

  html += `<div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">`;
  if (isProtected) {
    html += `<a href="#" class="pdf-btn-large"
              data-action="open-pdf"
              data-semester="${semesterIndex}"
              data-subject="${subjectIndex}">📥 Скачать PDF</a>`;
  } else {
    html += `<a href="pdf/sem${semesterIndex + 1}/${subject.folderName}.pdf"
              class="pdf-btn-large" target="_blank">📥 Скачать PDF</a>`;
  }
  html += `<a href="${reportUrl}" class="bug-btn-large" target="_blank">🐛 Сообщить об ошибке</a>`;
  html += `</div>`;

  if (isProtected) {
    const savedPassword = loadPassword(subjectId);
    const stillValid = savedPassword
      ? await verifyPasswordHash(savedPassword, subject.passwordHash)
      : false;

    // Если сохранённый пароль устарел — забываем его.
    if (savedPassword && !stillValid) {
      forgetPassword(subjectId);
    }

    if (stillValid) {
      html += `
        <div style="margin-top: 0; margin-bottom: 1rem; padding: 1rem; background: #f1f8f4; border-radius: 8px; border-left: 4px solid #4caf50;">
          <span style="font-size: 1.2rem;">✅</span>
          <span style="font-weight: 500;">У вас есть доступ к этому конспекту.</span>
          <span style="color: #666;">Пароль сохранён в браузере — PDF откроется без повторного ввода.</span>
          <a href="#" data-action="forget-creds"
             data-subject-id="${escapeHtml(subjectId)}"
             style="margin-left: 0.5rem; color: #c62828; border-bottom: 1px dashed #c62828;">Забыть пароль</a>
        </div>
      `;
    } else if (savedPassword) {
      html += `
        <div style="margin-top: 0; margin-bottom: 1rem; padding: 1rem; background: #fff8e1; border-radius: 8px; border-left: 4px solid #ff9800;">
          <span style="font-size: 1.2rem;">⚠️</span>
          <span style="font-weight: 500;">Сохранённый пароль больше не подходит.</span>
          <span style="color: #666;">Пароль от этого конспекта был изменён. При клике на ссылку потребуется ввести новый.</span>
        </div>
      `;
    } else {
      html += `
        <div style="margin-top: 0; margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #ff9800;">
          <span style="font-size: 1.2rem;">🔒</span>
          <span style="font-weight: 500;">Данный PDF-файл защищён паролем.</span>
          <span style="color: #666;">При клике на ссылку вам будет предложено ввести пароль для доступа к содержимому.</span>
        </div>
      `;
    }

    html += `
      <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f1f8f4; border-radius: 8px; border-left: 4px solid #4caf50;">
        <span style="font-size: 1.2rem;">ℹ️</span>
        <span style="font-weight: 500;">Пожалуйста, разрешите всплывающие окна для этого сайта.</span>
        <span style="color: #666;">PDF открывается в новой вкладке через временную ссылку (blob) — если всплывающие окна заблокированы, документ может не отобразиться.</span>
      </div>
    `;
  }

  html += '<h2>Лекции</h2>';
  html += '<div class="lecture-list">';

  subject.lectures.forEach((lecture) => {
    const isMissing = lecture.missing || false;
    let lectureHtml;

    if (isMissing) {
      lectureHtml = `<span style="color: #999;">${escapeHtml(lecture.name)}</span>`;
    } else if (isProtected) {
      const anchor = lecture.suffix || '';
      lectureHtml = `<a href="#"
        data-action="open-pdf"
        data-semester="${semesterIndex}"
        data-subject="${subjectIndex}"
        data-anchor="${escapeHtml(anchor)}">${escapeHtml(lecture.name)}</a>`;
    } else {
      let pdfLink = `pdf/sem${semesterIndex + 1}/${subject.folderName}.pdf`;
      if (lecture.suffix) {
        pdfLink += `#nameddest=lecture_${lecture.suffix}`;
      }
      lectureHtml = `<a href="${pdfLink}" target="_blank">${escapeHtml(lecture.name)}</a>`;
    }

    html += `
      <div class="lecture-item">
        <div class="lecture-name">${lectureHtml}</div>
        <div class="lecture-date">${escapeHtml(lecture.date)}</div>
        <div class="lecture-desc">${escapeHtml(lecture.desc || '')}</div>
        ${isMissing ? '<div class="meta">✏️ Конспект отсутствует</div>' : ''}
      </div>
    `;
  });

  html += '</div>';
  html += `<a href="#sem/${semesterIndex + 1}" class="back-link">← Все предметы семестра</a>`;
  contentEl.innerHTML = html;
}

export function notFound() {
  contentEl.innerHTML = '<h1>404</h1><p>Страница не найдена</p><a href="#/">На главную</a>';
}