// Маршрутизация по hash.

import { state } from './state.js';
import { renderHome, renderSemester, renderSubject, notFound } from './render.js';
import { updateNavBar, updateBreadcrumbs } from './nav.js';

export async function handleRouting() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter((p) => p);

  if (parts.length === 0) {
    state.currentView = { type: 'home' };
    renderHome();
  } else if (parts[0] === 'sem' && parts.length === 2) {
    const semesterIndex = parseInt(parts[1]) - 1;
    if (state.data && state.data.semesters[semesterIndex]) {
      state.currentView = { type: 'semester', semesterIndex };
      renderSemester(semesterIndex);
    } else {
      notFound();
    }
  } else if (parts[0] === 'sem' && parts.length === 3) {
    const semesterIndex = parseInt(parts[1]) - 1;
    const subjectIndex = parseInt(parts[2]);
    if (state.data &&
        state.data.semesters[semesterIndex] &&
        state.data.semesters[semesterIndex].subjects[subjectIndex]) {
      state.currentView = { type: 'subject', semesterIndex, subjectIndex };
      await renderSubject(semesterIndex, subjectIndex);
    } else {
      notFound();
    }
  } else {
    notFound();
  }

  updateNavBar();
  updateBreadcrumbs();
}