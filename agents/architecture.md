# Архитектура в рантайме

## Локальный стек (docker-compose.local.yml, проект `calendar`)

```
браузер → :3000 ─► frontend (nginx:alpine, порт 80)
                     ├─ /            → статика React, SPA-фолбэк на index.html
                     └─ /api /admin /static → backend:8000
                                          │
                               backend (gunicorn, 3 воркера, Django)
                                          │
                               db (postgres:16-alpine, том calendar_planner-localdata)
```

- Контейнеры общаются по именам сервисов (`backend`, `db`) во внутренней сети compose.
- Наружу открыт только порт 3000 (8080 на машине занят EnterpriseDB).
- `backend` ждёт `db` по healthcheck (`pg_isready`). При старте выполняет `migrate`, потом gunicorn.
- nginx пробрасывает `X-Forwarded-Proto`, Django доверяет ему (`SECURE_PROXY_SSL_HEADER`) — иначе за HTTPS-прокси будет цикл редиректов.

## Конфигурация

Всё через переменные окружения (django-environ): `DEBUG`, `SECRET_KEY` (обязателен при `DEBUG=False`),
`DATABASE_URL`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `SECURE_*`/`*_COOKIE_SECURE`,
`THROTTLE_LOGIN`/`THROTTLE_REGISTER`. Для локальной разработки — `backend/.env` (шаблон `.env.example`).

## CI (.github/workflows/ci.yml)

На push в main и PR, три параллельные джобы:
- **frontend**: typecheck, oxlint, vitest, build;
- **backend**: ruff, `manage.py check`, проверка забытых миграций, тесты на сервисном Postgres 16;
- **e2e**: Playwright против реального Django (SQLite) + Vite.

CD нет: образы не собираются и никуда не публикуются.
