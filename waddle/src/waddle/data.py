"""Работа с data.json, passwords.json и .gitignore."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

from waddle.colors import Color
from waddle.project import get_project_root


# ---------- JSON ----------

def load_json(path: Path) -> dict:
    """Загрузить JSON (UTF-8)."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(f"JSON file not found: {path}")
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON in {path}: {exc}")


def save_json(path: Path, data: dict) -> None:
    """Сохранить dict как JSON (UTF-8, pretty)."""
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as exc:
        raise RuntimeError(f"Failed to write JSON to {path}: {exc}")


# ---------- data.json ----------

def get_subject_info_from_data(data: dict, rel_path: str) -> tuple[dict, dict, str]:
    """
    По data.json и rel_path вида 'sem1/MathLog' найти записи семестра и предмета.

    :returns: (semester_entry, subject_entry, semester_folder)
    """
    parts = Path(rel_path).parts
    if len(parts) != 2:
        raise ValueError(
            f"Relative path must have exactly two components (semester/subject), "
            f"got: {rel_path}"
        )

    semester_folder, subject_folder = parts
    match = re.match(r"sem(\d+)", semester_folder)
    if not match:
        raise ValueError(
            f"Semester folder '{semester_folder}' does not match pattern 'semN'."
        )
    semester_number = int(match.group(1))

    if semester_number < 1 or semester_number > len(data.get("semesters", [])):
        raise ValueError(
            f"Semester number {semester_number} out of range in data.json."
        )

    semester_entry = data["semesters"][semester_number - 1]
    for subject in semester_entry.get("subjects", []):
        if subject.get("folderName") == subject_folder:
            return semester_entry, subject, semester_folder

    raise ValueError(
        f"Subject with folderName '{subject_folder}' not found "
        f"in semester {semester_folder}."
    )


# ---------- passwords.json ----------

def get_stored_password(passwords: dict, rel_path: str) -> str | None:
    """
    Извлечь пароль из passwords.json.
    Поддерживает как новый формат (строка), так и старый
    ({ "user": "...", "password": "..." }) — для обратной совместимости.
    """
    stored = passwords.get(rel_path)
    if stored is None:
        return None
    if isinstance(stored, dict):
        return stored.get("password")
    if isinstance(stored, str):
        return stored
    return None


# ---------- .gitignore ----------

def add_to_gitignore(file_path: Path) -> None:
    root = get_project_root()
    gitignore = root / ".gitignore"
    rel = str(file_path.relative_to(root))

    lines: list[str] = []
    if gitignore.exists():
        with open(gitignore, "r", encoding="utf-8") as reader:
            lines = [line.strip() for line in reader.readlines()]

    if rel not in lines:
        lines.append(rel)

    with open(gitignore, "w", encoding="utf-8") as writer:
        writer.write("\n".join(lines))

    try:
        rel_to_cwd = file_path.relative_to(Path.cwd())
    except ValueError:
        rel_to_cwd = file_path

    proc = subprocess.Popen(
        ["git", "rm", "-r", "--cached", str(rel_to_cwd)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    _, err = proc.communicate()
    proc.wait()

    if proc.returncode != 0:
        print(
            Color.yellow(
                f"cannot remove file from git cache: {err.decode().strip()}"
            ),
            file=sys.stderr,
        )


def remove_from_gitignore(file_path: Path) -> None:
    root = get_project_root()
    gitignore = root / ".gitignore"
    if not gitignore.exists():
        return

    rel = str(file_path.relative_to(root))
    with open(gitignore, "r", encoding="utf-8") as reader:
        lines = [line.strip() for line in reader.readlines()]

    if rel in lines:
        lines.remove(rel)

    with open(gitignore, "w", encoding="utf-8") as writer:
        writer.write("\n".join(lines))