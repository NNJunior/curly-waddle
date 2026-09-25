"""
Шифрование и расшифровка файлов: PBKDF2-HMAC-SHA256 + AES-GCM.

Формат зашифрованного файла: [salt (16)] [nonce (12)] [ciphertext + tag]
Ключ вычисляется только из пароля (без имени пользователя).
"""

from __future__ import annotations

import os
from pathlib import Path

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

SALT_LEN = 16
NONCE_LEN = 12
PBKDF2_ITERATIONS = 100_000
KEY_LENGTH = 32  # AES-256


def _derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=KEY_LENGTH,
        salt=salt,
        iterations=PBKDF2_ITERATIONS,
    )
    return kdf.derive(password.encode("utf-8"))


def encrypt_file(file_path: Path, password: str) -> None:
    """
    Зашифровать файл. Файл перезаписывается: salt + nonce + ciphertext+tag.

    :param file_path: Путь к файлу.
    :param password:  Пароль (строка).
    """
    salt = os.urandom(SALT_LEN)
    nonce = os.urandom(NONCE_LEN)
    key = _derive_key(password, salt)
    aesgcm = AESGCM(key)
    data = file_path.read_bytes()
    encrypted = aesgcm.encrypt(nonce, data, None)
    file_path.write_bytes(salt + nonce + encrypted)


def decrypt_file(file_path: Path, password: str) -> None:
    """
    Расшифровать файл, зашифрованный encrypt_file.

    :raises ValueError: при неверном пароле или повреждённых данных.
    """
    raw = file_path.read_bytes()
    salt = raw[:SALT_LEN]
    nonce = raw[SALT_LEN:SALT_LEN + NONCE_LEN]
    ciphertext = raw[SALT_LEN + NONCE_LEN:]

    key = _derive_key(password, salt)
    aesgcm = AESGCM(key)

    try:
        decrypted = aesgcm.decrypt(nonce, ciphertext, None)
    except Exception as exc:
        raise ValueError("Неверный пароль или файл повреждён") from exc

    file_path.write_bytes(decrypted)