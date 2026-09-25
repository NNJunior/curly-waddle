"""Работа со структурой проекта: корень, разрешение путей лекций."""

from __future__ import annotations

from pathlib import Path


def get_project_root() -> Path:
    """
    Вернуть корень проекта — директорию, где лежит этот пакет
    (в контексте editable-установки — обычно корень репозитория).
    Проверяет наличие обязательных подпапок lectures-phystech/.
    """
    # Ищем lectures-phystech, поднимаясь от текущего файла вверх.
    here = Path(__file__).resolve()
    for candidate in [here.parent, *here.parents]:
        if (candidate / "lectures-phystech").is_dir():
            return candidate

    # Fallback: попробуем от CWD
    cwd = Path.cwd().resolve()
    for candidate in [cwd, *cwd.parents]:
        if (candidate / "lectures-phystech").is_dir():
            return candidate

    raise RuntimeError(
        "lectures-phystech folder not found in current directory or its parents."
    )


def resolve_lecture_dir(source_path: str, project_root: Path) -> tuple[Path, str]:
    """
    Разрешить директорию лекции и вернуть (абсолютный путь, rel_path).

    source_path может быть:
      - относительным lectures-phystech/lectures (например, 'sem1/MathLog');
      - абсолютным или относительным CWD, если указывает внутрь
        lectures-phystech/lectures.
    """
    lectures_base = project_root / "lectures-phystech" / "lectures"

    src_dir = (lectures_base / source_path).resolve()
    if not src_dir.is_dir():
        src_dir = (Path.cwd() / source_path).resolve()
        if not src_dir.is_dir():
            raise FileNotFoundError(
                f"Source directory '{source_path}' not found (neither relative to "
                f"{lectures_base} nor to current working directory)."
            )

    try:
        rel_path = src_dir.relative_to(lectures_base)
    except ValueError:
        raise ValueError(
            f"Source directory '{src_dir}' is not inside {lectures_base}."
        )

    return src_dir, str(rel_path)