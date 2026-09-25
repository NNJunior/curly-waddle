// Глобальное состояние приложения и ссылки на DOM-элементы

export const state = {
  data: null,
  currentView: { type: 'home', semesterIndex: null, subjectIndex: null }
};

export const GITHUB_REPO = 'https://github.com/NNJunior/curly-waddle';

export const navBar = document.getElementById('nav-bar');
export const breadcrumbsEl = document.getElementById('breadcrumbs');
export const contentEl = document.getElementById('content');