// Проверка пароля по хешу из data.json.
// PBKDF2-HMAC-SHA256, 100 000 итераций, 32 байта, salt = 16 байт.

const HASH_ITERATIONS = 100000;
const HASH_LENGTH = 32;

function base64Decode(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function base64Encode(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function pbkdf2(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: HASH_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    HASH_LENGTH * 8
  );
  return new Uint8Array(bits);
}

/**
 * Вычислить "<base64(salt)>:<base64(hash)>" для пароля с заданной солью.
 */
export async function computePasswordHash(password, salt) {
  const derived = await pbkdf2(password, salt);
  return `${base64Encode(salt)}:${base64Encode(derived)}`;
}

/**
 * Проверить, соответствует ли пароль сохранённой строке passwordHash.
 * Возвращает false при любой ошибке (неверный формат и т.п.).
 */
export async function verifyPasswordHash(password, stored) {
  if (!password || !stored) return false;
  try {
    const [saltB64] = stored.split(':');
    if (!saltB64) return false;
    const salt = base64Decode(saltB64);
    const computed = await computePasswordHash(password, salt);
    return computed === stored;
  } catch {
    return false;
  }
}