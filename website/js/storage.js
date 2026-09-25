// Хранение паролей в localStorage по каждому конспекту отдельно.
// Идентификатор конспекта: "sem{N}/{folderName}" (например, "sem1/matan").

const CRED_KEY = 'pdf_credentials';

/**
 * Сформировать идентификатор конспекта.
 * @param {number} semesterIndex — 0-based индекс семестра
 * @param {object} subject      — объект предмета с полем folderName
 * @returns {string}
 */
export function getSubjectId(semesterIndex, subject) {
  return `sem${semesterIndex + 1}/${subject.folderName}`;
}

/**
 * Прочитать всю карту паролей.
 * @returns {Object<string, string>}
 */
function readAll() {
  const raw = localStorage.getItem(CRED_KEY);
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return (obj && typeof obj === 'object') ? obj : {};
  } catch (e) {
    return {};
  }
}

/**
 * Записать всю карту паролей.
 */
function writeAll(map) {
  try {
    localStorage.setItem(CRED_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Не удалось сохранить пароль:', e);
  }
}

/**
 * Сохранить пароль для конкретного конспекта.
 */
export function savePassword(subjectId, password) {
  const map = readAll();
  map[subjectId] = password;
  writeAll(map);
}

/**
 * Прочитать пароль для конкретного конспекта.
 * @returns {string|null}
 */
export function loadPassword(subjectId) {
  const map = readAll();
  const value = map[subjectId];
  return (typeof value === 'string' && value.length > 0) ? value : null;
}

/**
 * Удалить пароль конкретного конспекта.
 */
export function forgetPassword(subjectId) {
  const map = readAll();
  if (subjectId in map) {
    delete map[subjectId];
    writeAll(map);
  }
}

/**
 * Удалить все пароли (опционально).
 */
export function forgetAllPasswords() {
  localStorage.removeItem(CRED_KEY);
}