"""Компиляция лекции в PDF."""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from waddle.colors import Color
from waddle.encoding import read_file_with_encoding_detection
from waddle.fs import safe_copy_file, safe_copy_tree
from waddle.project import get_project_root, resolve_lecture_dir


def prepare_compilation_directory(
    temp_dir: Path, project_root: Path, src_dir: Path
) -> None:
    """
    Наполнить временную директорию всем необходимым для компиляции:
      - preamble/ целиком,
      - images/ (если есть),
      - setting.tex и main.tex из каталога лекции,
      - preamble/main.tex → document.tex (как есть, без правок).
    """
    lectures_phystech = project_root / "lectures-phystech"

    # 1. preamble
    preamble_src = lectures_phystech / "preamble"
    if not preamble_src.is_dir():
        raise NotADirectoryError(f"Preamble folder not found: {preamble_src}")
    safe_copy_tree(preamble_src, temp_dir / "preamble")

    # 2. images (опционально)
    images_src = lectures_phystech / "images"
    if images_src.is_dir():
        safe_copy_tree(images_src, temp_dir / "images")
    else:
        print(
            Color.yellow("Warning: images folder not found, images may be missing."),
            file=sys.stderr,
        )

    # 3. setting.tex и main.tex
    setting_src = src_dir / "setting.tex"
    main_src = src_dir / "main.tex"
    if not setting_src.is_file():
        raise FileNotFoundError(f"Missing required file: {setting_src}")
    if not main_src.is_file():
        raise FileNotFoundError(f"Missing required file: {main_src}")

    safe_copy_file(setting_src, temp_dir / "setting.tex")
    safe_copy_file(main_src, temp_dir / "main.tex")

    # 4. Шаблон → document.tex
    template_path = temp_dir / "preamble" / "main.tex"
    if not template_path.is_file():
        raise FileNotFoundError(f"Template not found: {template_path}")

    _, template_encoding = read_file_with_encoding_detection(template_path)
    print(Color.blue(f"Template encoding: {template_encoding}"))

    safe_copy_file(template_path, temp_dir / "document.tex")
    print(Color.blue("Template copied verbatim to document.tex"))


def compile_pdf(temp_dir: Path, pdflatex_cmd: str, runs: int = 2) -> Path:
    """Запустить pdflatex `runs` раз и вернуть путь к PDF."""
    pdflatex = shutil.which(pdflatex_cmd)
    if not pdflatex:
        raise RuntimeError(
            f"'{pdflatex_cmd}' not found in PATH. "
            "Please install LaTeX or specify a valid path."
        )

    for i in range(runs):
        try:
            result = subprocess.run(
                [pdflatex, "-interaction=nonstopmode", "document.tex"],
                cwd=temp_dir,
                capture_output=True,
                timeout=300,
            )
        except subprocess.TimeoutExpired:
            raise RuntimeError(
                f"pdflatex timed out after 300 seconds (run {i + 1}/{runs})"
            )
        except Exception as exc:
            raise RuntimeError(f"Failed to execute pdflatex: {exc}")

        if result.returncode != 0:
            sys.stderr.buffer.write(result.stderr)
            sys.stderr.buffer.write(result.stdout)
            raise subprocess.CalledProcessError(
                result.returncode,
                result.args,
                output=result.stdout,
                stderr=result.stderr,
            )

    pdf_path = temp_dir / "document.pdf"
    if not pdf_path.is_file():
        raise FileNotFoundError("PDF was not created after compilation")
    return pdf_path


def compile_lecture(source_dir: str, pdflatex_cmd: str = "pdflatex",
                    runs: int = 2, keep_temp: bool = False) -> None:
    """Точка входа для подкоманды `compile`."""
    try:
        project_root = get_project_root()
    except RuntimeError as exc:
        sys.exit(Color.red(f"Error: {exc}"))

    print(Color.blue(f"Project root: {project_root}"))

    try:
        src_dir, _ = resolve_lecture_dir(source_dir, project_root)
    except Exception as exc:
        sys.exit(Color.red(f"Error: {exc}"))

    setting_path = src_dir / "setting.tex"
    main_path = src_dir / "main.tex"
    if not setting_path.is_file():
        sys.exit(Color.red(f"Error: {setting_path} is missing."))
    if not main_path.is_file():
        sys.exit(Color.red(f"Error: {main_path} is missing."))

    sem_dir = src_dir.parent.name
    subject_name = src_dir.name

    target_dir = project_root / "website" / "pdf" / sem_dir
    try:
        target_dir.mkdir(parents=True, exist_ok=True)
    except Exception as exc:
        sys.exit(Color.red(f"Error creating output directory {target_dir}: {exc}"))
    target_pdf = target_dir / f"{subject_name}.pdf"

    try:
        with tempfile.TemporaryDirectory(prefix="compile_lecture_") as tmp:
            temp_dir = Path(tmp)
            try:
                prepare_compilation_directory(temp_dir, project_root, src_dir)
                pdf_path = compile_pdf(temp_dir, pdflatex_cmd, runs)
                safe_copy_file(pdf_path, target_pdf)
                print(Color.green(f"Done: {target_pdf}"))
            except Exception as exc:
                print(Color.red(f"Compilation error: {exc}"), file=sys.stderr)
                if keep_temp:
                    print(
                        Color.yellow(f"Temporary files kept in {temp_dir}"),
                        file=sys.stderr,
                    )
                sys.exit(1)

            if keep_temp:
                keep_path = Path.cwd() / f"temp_{sem_dir}_{subject_name}"
                try:
                    shutil.move(str(temp_dir), str(keep_path))
                    print(Color.yellow(f"Temporary files moved to {keep_path}"))
                except Exception as exc:
                    print(
                        Color.red(f"Failed to move temporary directory: {exc}"),
                        file=sys.stderr,
                    )
                    sys.exit(1)

    except KeyboardInterrupt:
        print(Color.yellow("\nInterrupted by user."), file=sys.stderr)
        sys.exit(130)
    except Exception as exc:
        print(Color.red(f"Unexpected error: {exc}"), file=sys.stderr)
        sys.exit(1)