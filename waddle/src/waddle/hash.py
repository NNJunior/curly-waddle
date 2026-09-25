"""Вычисление хеша пароля для проверки на клиенте."""

from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

HASH_SALT_LEN = 16
HASH_ITERATIONS = 100_000
HASH_LENGTH = 32


def compute_password_hash(password: str, salt: bytes | None = None) -> str:
    """
    Вернуть строку "<base64(salt)>:<base64(hash)>".
    Если salt не задан — генерируется случайно.
    """
    if salt is None:
        salt = os.urandom(HASH_SALT_LEN)

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=HASH_LENGTH,
        salt=salt,
        iterations=HASH_ITERATIONS,
    )
    derived = kdf.derive(password.encode("utf-8"))

    salt_b64 = base64.b64encode(salt).decode("ascii")
    hash_b64 = base64.b64encode(derived).decode("ascii")
    return f"{salt_b64}:{hash_b64}"