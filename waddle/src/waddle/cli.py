"""CLI: парсинг аргументов и диспетчеризация."""

from __future__ import annotations

import argparse
import sys

from waddle.colors import Color
from waddle.compile import compile_lecture
from waddle.protect import manage_protection


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="waddle",
        description=Color.bold("Compile lectures and manage protection."),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # ---- compile ----
    compile_parser = subparsers.add_parser(
        "compile",
        help="Compile a lecture into PDF.",
        description="Compile a lecture from lectures-phystech/lectures/semN/SubjectName.",
    )
    compile_parser.add_argument(
        "source_dir",
        help="Path to the lecture folder relative to lectures-phystech/lectures/, "
             "e.g. 'sem1/MathLog' or 'sem2/Calculus'.",
    )
    compile_parser.add_argument(
        "--pdflatex",
        default="pdflatex",
        help="Path to the pdflatex executable (default: search in PATH)",
    )
    compile_parser.add_argument(
        "--runs",
        type=int,
        default=2,
        help="Number of pdflatex runs (default: 2)",
    )
    compile_parser.add_argument(
        "--keep-temp",
        action="store_true",
        help="Do not delete the temporary directory (useful for debugging)",
    )

    # ---- protect ----
    protect_parser = subparsers.add_parser(
        "protect",
        help="Protect a lecture subject with a password.",
        description="Protect a subject by adding a password and marking it as protected.",
    )
    protect_parser.add_argument(
        "-f", "--force", action="store_true",
        help="Force create a password (override existing one, if exists)",
    )
    protect_parser.add_argument("source_dir", help="Path to the lecture folder.")

    # ---- unprotect ----
    unprotect_parser = subparsers.add_parser(
        "unprotect",
        help="Remove protection from a lecture subject.",
        description="Remove password and protected flag from a subject.",
    )
    unprotect_parser.add_argument(
        "-f", "--force", action="store_true",
        help="Force remove a password",
    )
    unprotect_parser.add_argument("source_dir", help="Path to the lecture folder.")

    return parser


def main(argv: list[str] | None = None) -> None:
    """Точка входа CLI."""
    argv = list(sys.argv[1:] if argv is None else argv)

    # Если первый аргумент не подкоманда — подразумеваем compile.
    if argv and argv[0] not in ("compile", "protect", "unprotect", "-h", "--help"):
        argv.insert(0, "compile")

    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "compile":
        compile_lecture(
            source_dir=args.source_dir,
            pdflatex_cmd=args.pdflatex,
            runs=args.runs,
            keep_temp=args.keep_temp,
        )
    elif args.command in ("protect", "unprotect"):
        try:
            manage_protection(
                args.source_dir,
                protect=(args.command == "protect"),
                force=args.force,
            )
        except Exception as exc:
            sys.exit(Color.red(f"Error: {exc}"))


if __name__ == "__main__":
    main()