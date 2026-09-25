"""Файловые операции с обработкой ошибок."""

from __future__ import annotations

import shutil
from pathlib import Path


def safe_copy_tree(
    src: Path, dst: Path, ignore_dangling_symlinks: bool = False
) -> None:
    """Скопировать дерево каталогов."""
    try:
        shutil.copytree(src, dst, ignore_dangling_symlinks=ignore_dangling_symlinks)
    except FileExistsError:
        raise RuntimeError(f"Destination directory already exists: {dst}")
    except PermissionError as exc:
        raise PermissionError(f"Permission denied copying {src} to {dst}: {exc}")
    except OSError as exc:
        raise RuntimeError(f"Failed to copy {src} to {dst}: {exc}")


def safe_copy_file(src: Path, dst: Path) -> None:
    """Скопировать файл с сохранением метаданных."""
    try:
        shutil.copy2(src, dst)
    except FileNotFoundError:
        raise FileNotFoundError(f"Source file not found: {src}")
    except PermissionError as exc:
        raise PermissionError(f"Permission denied copying {src} to {dst}: {exc}")
    except OSError as exc:
        raise RuntimeError(f"Failed to copy {src} to {dst}: {exc}")