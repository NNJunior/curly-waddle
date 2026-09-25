"""Управление защитой паролем: protect / unprotect."""

from __future__ import annotations

import sys
from pathlib import Path

from waddle.colors import Color
from waddle.crypto import decrypt_file, encrypt_file
from waddle.data import (
    add_to_gitignore,
    get_stored_password,
    get_subject_info_from_data,
    load_json,
    remove_from_gitignore,
    save_json,
)
from waddle.hash import compute_password_hash
from waddle.project import get_project_root, resolve_lecture_dir


def manage_protection(source_path: str, protect: bool, force: bool) -> None:
    """
    Включить или снять защиту паролем.

    protect=True:  сохранить пароль в passwords.json,
                   записать хеш пароля в data.json (поле passwordHash),
                   зашифровать файлы.
    protect=False: расшифровать файлы, удалить passwordHash из data.json.
    """
    project_root = get_project_root()

    try:
        src_dir, rel_path = resolve_lecture_dir(source_path, project_root)
    except Exception as exc:
        sys.exit(Color.red(f"Error resolving source directory: {exc}"))

    print(Color.blue(f"Subject relative path: {rel_path}"))

    data_path = project_root / "website" / "data.json"
    try:
        data = load_json(data_path)
    except Exception as exc:
        sys.exit(Color.red(f"Error loading data.json: {exc}"))

    try:
        _, subject_entry, _ = get_subject_info_from_data(data, rel_path)
    except Exception as exc:
        sys.exit(Color.red(f"Error finding subject in data.json: {exc}"))

    passwords_path = project_root / "passwords.json"
    passwords: dict = {}
    if passwords_path.exists():
        try:
            passwords = load_json(passwords_path)
        except Exception as exc:
            sys.exit(Color.red(f"Error loading passwords.json: {exc}"))

    files_for_cryptography = [
        Path(project_root / "website" / "pdf" / rel_path).with_suffix(".pdf"),
        (Path(src_dir) / "main").with_suffix(".tex"),
        (Path(src_dir) / "setting").with_suffix(".tex"),
    ]
    file_for_gitignore: list[Path] = []

    if protect:
        if force:
            password = input("Password: ")
        else:
            password = get_stored_password(passwords, rel_path)
            if not password:
                sys.exit(Color.red(
                    f"Subject has no saved password: {rel_path}. "
                    f"Use --force to set a new one."
                ))
    else:
        if rel_path not in passwords:
            sys.exit(Color.red(f"Subject is not protected: {rel_path}"))

        password = get_stored_password(passwords, rel_path)
        if not password:
            sys.exit(Color.red(f"No password is provided for subject {rel_path}"))

    if protect:
        if "passwordHash" in subject_entry:
            sys.exit(Color.red(f"Subject is protected: {rel_path}"))

        # Открытый пароль — для дальнейших операций waddle.
        passwords[rel_path] = password
        # Публикуем необратимый хеш в data.json.
        subject_entry["passwordHash"] = compute_password_hash(password)

        for file in files_for_cryptography:
            encrypt_file(file, password)

        for file in file_for_gitignore:
            add_to_gitignore(file)

        print(Color.green(f"Subject protected with password. Path: {src_dir}"))
    else:
        if "passwordHash" not in subject_entry:
            sys.exit(Color.red(f"Subject is not protected: {rel_path}"))

        for file in files_for_cryptography:
            decrypt_file(file, password)

        for file in file_for_gitignore:
            remove_from_gitignore(file)

        if force:
            del passwords[rel_path]

        subject_entry.pop("passwordHash", None)
        print(Color.green(f"Subject unprotected. Path: {rel_path}"))

    try:
        save_json(passwords_path, passwords)
    except Exception as exc:
        sys.exit(Color.red(f"Error saving passwords.json: {exc}"))

    try:
        save_json(data_path, data)
    except Exception as exc:
        sys.exit(Color.red(f"Error saving data.json: {exc}"))

    print(Color.green("Files updated successfully."))