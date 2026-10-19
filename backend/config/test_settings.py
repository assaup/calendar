"""Проверки конфигурации: health-эндпоинт и прод-настройки безопасности.

Тесты с пометкой BUG-xx описывают ОЖИДАЕМОЕ поведение и сейчас падают —
см. QA_REPORT.md.
"""

import os
import subprocess
import sys
from pathlib import Path

from django.test import SimpleTestCase, TestCase

BACKEND_DIR = Path(__file__).resolve().parent.parent


def load_settings_in_subprocess(env_overrides: dict) -> subprocess.CompletedProcess:
    """Импортирует config.settings в чистом процессе с заданным окружением."""
    env = {k: v for k, v in os.environ.items() if k not in {"SECRET_KEY", "DEBUG"}}
    env.update(env_overrides)
    # backend/.env (локальный, dev) не читаем — как на сервере, где его нет
    code = (
        "import os, environ;"
        "environ.Env.read_env = staticmethod(lambda *a, **k: None);"
        "os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings');"
        "from django.conf import settings;"
        "print(settings.SECRET_KEY)"
    )
    return subprocess.run(
        [sys.executable, "-c", code],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )


class HealthTests(TestCase):
    def test_health_is_public(self):
        resp = self.client.get("/api/health/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "ok")


class ProdSettingsTests(SimpleTestCase):
    def test_bug13_prod_refuses_default_secret_key(self):
        """BUG-13: при DEBUG=False и незаданном SECRET_KEY используется публичный
        'dev-insecure-change-me' — подпись сессий/CSRF предсказуема. В проде
        запуск без SECRET_KEY должен падать."""
        result = load_settings_in_subprocess({"DEBUG": "False"})
        printed = result.stdout.strip()
        self.assertFalse(
            result.returncode == 0 and printed in ("", "dev-insecure-change-me"),
            f"Настройки загрузились с небезопасным SECRET_KEY={printed!r}",
        )
