"""Определение кодировки текстовых файлов."""

from __future__ import annotations

import sys
from pathlib import Path

from waddle.colors import Color

try:
    import chardet  # type: ignore
    HAS_CHARDET = True
except ImportError:
    HAS_CHARDET = False


def detect_file_encoding(path: Path, default: str = "utf-8") -> str:
    """
    Определить кодировку файла.

    Сначала пытается chardet (если установлен), затем перебирает
    utf-8, cp1251, koi8-r, latin1.
    """
    if HAS_CHARDET:
        try:
            raw = path.read_bytes()
            result = chardet.detect(raw)
            enc = result.get("encoding")
            if enc:
                return enc
        except Exception as exc:
            print(
                Color.yellow(
                    f"Warning: chardet failed for {path.name}: {exc}. "
                    "Falling back to manual encoding detection."
                ),
                file=sys.stderr,
            )

    for enc in ("utf-8", "cp1251", "koi8-r", "latin1"):
        try:
            with open(path, "r", encoding=enc) as f:
                f.read()
            return enc
        except UnicodeDecodeError:
            continue
        except Exception as exc:
            raise RuntimeError(
                f"Failed to read file {path} with encoding {enc}: {exc}"
            )

    return default


def read_file_with_encoding_detection(path: Path) -> tuple[list[str], str]:
    """
    Прочитать файл, автоматически определив кодировку.

    :returns: (строки, использованная кодировка)
    """
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")

    enc = detect_file_encoding(path)
    try:
        with open(path, "r", encoding=enc) as f:
            lines = f.readlines()
        return lines, enc
    except Exception as exc:
        raise RuntimeError(f"Could not read file {path} with encoding {enc}: {exc}")