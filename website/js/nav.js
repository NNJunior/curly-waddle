// Навигационная панель и хлебные крошки.

import { state, navBar, breadcrumbsEl } from './state.js';

export function updateNavBar() {
  const data = state.data;
  const view = state.currentView;

  const links = [
    { name: '🏠 Главная', hash: '#/' },
    ...data.semesters.map((sem, idx) => ({ name: sem.name, hash: `#sem/${idx + 1}` }))
  ];

  navBar.innerHTML = links.map((link) => {
    const active =
      (view.type === 'home' && link.hash === '#/') ||
      (view.type === 'semester' && link.hash === `#sem/${view.semesterIndex + 1}`) ||
      (view.type === 'subject' && link.hash === `#sem/${view.semesterIndex + 1}`);
    return `<a href="${link.hash}" ${active ? 'style="background: var(--primary); color: white;"' : ''}>${link.name}</a>`;
  }).join('');

  navBar.innerHTML += `<a href="tic-tac-toe.html">🎮 Игра</a>`;
}

export function updateBreadcrumbs() {
  const data = state.data;
  const view = state.currentView;

  let html = '<a href="#/">Главная</a>';
  if (view.type === 'semester' || view.type === 'subject') {
    const sem = data.semesters[view.semesterIndex];
    html += ` / <a href="#sem/${view.semesterIndex + 1}">${sem.name}</a>`;
  }
  if (view.type === 'subject') {
    const subj = data.semesters[view.semesterIndex].subjects[view.subjectIndex];
    html += ` / ${subj.name}`;
  }
  breadcrumbsEl.innerHTML = html;
}