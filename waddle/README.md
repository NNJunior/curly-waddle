# waddle

Утилита для компиляции конспектов (LaTeX → PDF) и управления их защитой паролем.

## Установка

Рекомендуется через [`pipx`](https://pipx.pypa.io/) или в виртуальном окружении:

```bash
pipx install -e .
# или
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

Опционально — улучшенное определение кодировок через `chardet`:

```bash
pip install -e ".[encoding]"
```

## Использование

Из корня проекта, где лежат папки `lectures-phystech/` и `website/`:

```bash
waddle compile sem1/MathLog
waddle protect sem1/MathLog
waddle protect --force sem1/MathLog
waddle unprotect sem1/MathLog
```

Можно также запустить без установки:

```bash
python -m waddle compile sem1/MathLog
```

(при этом `src/` должен быть в `PYTHONPATH`, либо запускать из папки, где установлен пакет)