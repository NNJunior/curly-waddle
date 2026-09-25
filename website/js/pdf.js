// Открытие защищённых PDF: загрузка, расшифровка, отображение.

import { state } from './state.js';
import {
  getSubjectId,
  loadPassword,
  savePassword,
  forgetPassword
} from './storage.js';
import { decryptProtectedData } from './crypto.js';
import { showPasswordDialog } from './dialog.js';
import { renderSubject } from './render.js';

/**
 * Открыть расшифрованный PDF в новой вкладке.
 */
export function showDecryptedPDF(decryptedData, anchor) {
  const blob = new Blob([decryptedData], { type: 'application/pdf' });
  let url = URL.createObjectURL(blob);
  if (anchor) {
    url += '#nameddest=lecture_' + anchor;
  }
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Открыть защищённый PDF.
 * Сначала пробуем сохранённый пароль для конкретного конспекта,
 * затем запрашиваем ввод.
 */
export async function openProtectedPDF(semesterIndex, subjectIndex, anchor) {
  const subject = state.data.semesters[semesterIndex].subjects[subjectIndex];
  const subjectId = getSubjectId(semesterIndex, subject);
  const pdfPath = `pdf/sem${semesterIndex + 1}/${subject.folderName}.pdf`;

  try {
    const response = await fetch(pdfPath);
    if (!response.ok) throw new Error('Не удалось загрузить PDF');
    const encryptedBuffer = await response.arrayBuffer();

    // 1. Пробуем сохранённый пароль для этого конспекта
    let password = loadPassword(subjectId);
    let hadSavedPassword = false;
    if (password) {
      try {
        const decryptedData = await decryptProtectedData(encryptedBuffer, password);
        showDecryptedPDF(decryptedData, anchor);
        return;
      } catch (e) {
        // Не подошёл — удаляем только для этого конспекта
        hadSavedPassword = true;
        forgetPassword(subjectId);
        password = null;
      }
    }

    // 2. Запрашиваем пароль
    const message = hadSavedPassword
      ? `Сохранённый пароль для конспекта «${subject.name}» больше не подходит. Введите новый пароль:`
      : `Введите пароль для доступа к конспекту «${subject.name}»:`;

    password = await showPasswordDialog(message);
    if (password === null) return;

    const decryptedData = await decryptProtectedData(encryptedBuffer, password);

    savePassword(subjectId, password);

    // Обновляем страницу, чтобы появилось зелёное уведомление
    if (state.currentView.type === 'subject' &&
        state.currentView.semesterIndex === semesterIndex &&
        state.currentView.subjectIndex === subjectIndex) {
      await renderSubject(semesterIndex, subjectIndex);
    }

    showDecryptedPDF(decryptedData, anchor);
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
}