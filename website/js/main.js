// Точка входа: загрузка данных, обработчик событий, старт маршрутизации.

import { state, contentEl } from './state.js';
import { handleRouting } from './router.js';
import { openProtectedPDF } from './pdf.js';
import { forgetPassword } from './storage.js';
import { renderSubject } from './render.js';

async function loadData() {
  try {
    const response = await fetch('data.json');
    state.data = await response.json();
    await handleRouting();
  } catch (error) {
    contentEl.innerHTML = '<div class="loading">Ошибка загрузки данных</div>';
    console.error(error);
  }
}

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;

  const action = el.dataset.action;

  if (action === 'open-pdf') {
    e.preventDefault();
    const semesterIndex = parseInt(el.dataset.semester);
    const subjectIndex = parseInt(el.dataset.subject);
    const anchor = el.dataset.anchor || null;
    await openProtectedPDF(semesterIndex, subjectIndex, anchor);
  } else if (action === 'forget-creds') {
    e.preventDefault();
    const subjectId = el.dataset.subjectId;
    if (subjectId) forgetPassword(subjectId);
    if (state.currentView.type === 'subject') {
      await renderSubject(state.currentView.semesterIndex, state.currentView.subjectIndex);
    }
  }
});

window.addEventListener('hashchange', () => {
  handleRouting().catch((err) => console.error(err));
});

loadData();