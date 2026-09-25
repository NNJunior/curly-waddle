// Расшифровка PDF, зашифрованных Python-скриптом (PBKDF2 + AES-GCM).
// Формат файла: [salt (16)] [nonce (12)] [ciphertext + auth tag].
// Ключ вычисляется из пароля пользователя.

/**
 * Получение ключа AES-256 из пароля.
 */
export async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['decrypt']
  );
}

/**
 * Расшифровать данные.
 * @returns {Promise<ArrayBuffer>}
 */
export async function decryptProtectedData(encryptedData, password) {
  const data = new Uint8Array(encryptedData);
  const salt = data.slice(0, 16);
  const nonce = data.slice(16, 28);
  const ciphertext = data.slice(28);
  const key = await deriveKey(password, salt);
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce },
      key,
      ciphertext
    );
    return decrypted;
  } catch (e) {
    throw new Error('Неверный пароль или файл повреждён');
  }
}