// Модальное окно ввода пароля.

/**
 * Показать диалог в стиле сайта.
 * @param {string} message
 * @returns {Promise<string|null>} — введённый пароль или null (отмена)
 */
export function showPasswordDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top:0; left:0; width:100%; height:100%;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(2px);
    `;

    const form = document.createElement('form');
    form.style.cssText = `
      background: var(--surface, #ffffff);
      padding: 2rem 2.5rem;
      border-radius: var(--radius, 16px);
      max-width: 420px;
      width: 90%;
      box-shadow: var(--shadow, 0 4px 12px rgba(0,0,0,0.12));
      border: 1px solid var(--border, #e4e4e4);
    `;
    form.onsubmit = (e) => e.preventDefault();

    form.innerHTML = `
      <p style="margin-top:0; margin-bottom:1.5rem; font-size:1.1rem; color: var(--text, #1e1e1e);">
        ${message}
      </p>

      <label for="password" style="display:block; font-size:0.9rem; color: var(--text-light, #5a5a5a); margin-bottom:0.35rem;">
        Пароль
      </label>
      <input type="password" id="password" name="password" autocomplete="current-password"
             style="width:100%; padding:0.75rem; font-size:1rem;
                    border:1px solid var(--border, #ccc); border-radius:8px;
                    box-sizing:border-box; background: var(--bg, #faf9f8);
                    color: var(--text, #1e1e1e); outline: none;
                    transition: border-color 0.2s;"
             placeholder="Введите пароль">

      <div style="display:flex; gap:0.75rem; margin-top:1.5rem; justify-content:flex-end;">
        <button type="button" id="cancelBtn" style="padding:0.6rem 1.5rem; background: var(--bg, #f0f0f0);
               border: none; border-radius:30px; cursor:pointer; font-size:0.95rem;
               color: var(--text, #1e1e1e); transition: background 0.15s;">
          Отмена
        </button>
        <button type="submit" id="okBtn" style="padding:0.6rem 1.5rem; background: var(--primary, #2b3a67);
               color: white; border: none; border-radius:30px; cursor:pointer; font-size:0.95rem;
               transition: background 0.15s;">
          OK
        </button>
      </div>
    `;

    overlay.appendChild(form);
    document.body.appendChild(overlay);

    const passwordInput = form.querySelector('#password');
    const okBtn = form.querySelector('#okBtn');
    const cancelBtn = form.querySelector('#cancelBtn');

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    const submit = () => {
      const password = passwordInput.value;
      if (!password) {
        passwordInput.style.borderColor = '#e53935';
        return;
      }
      close(password);
    };

    form.addEventListener('submit', submit);
    cancelBtn.addEventListener('click', () => close(null));

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

    passwordInput.addEventListener('focus', () => {
      passwordInput.style.borderColor = 'var(--primary, #2b3a67)';
    });
    passwordInput.addEventListener('blur', () => {
      passwordInput.style.borderColor = 'var(--border, #ccc)';
    });

    setTimeout(() => passwordInput.focus(), 50);
  });
}