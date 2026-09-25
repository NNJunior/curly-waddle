// Утилиты

/**
 * Экранирование HTML для защиты от XSS.
 * Применяйте ко всем данным, попадающим в innerHTML.
 */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}