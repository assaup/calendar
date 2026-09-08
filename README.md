# Планер

Личный аналог Asana: **календарь + доска (канбан) + список задач + заметки + панель со статистикой**.
Задача — единая сущность: одна запись видна в календаре, на доске и в списке.
Разделение работы и личного — через рабочие пространства (workspaces).
Данные хранятся на сервере (Django + PostgreSQL), у каждого пользователя свои.

## Стек

| Слой | Технологии |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite, Mantine (UI), SCSS-модули, Zustand, React Router, dnd-kit, Tiptap (заметки) |
| Backend | Django 5 + Django REST Framework, gunicorn, WhiteNoise |
| БД | PostgreSQL |
| Три темы | тёмная, светлая, розовая |
| Линтеры | oxlint (+ jsx-a11y), Prettier, Stylelint (front) · Ruff, Black (back) |

## Структура

```
calendar/
├─ frontend/                 React-приложение
│  └─ src/
│     ├─ components/         layout (сайдбар, темы) и общие UI
│     ├─ features/           calendar, board, todo, notes, dashboard, auth, data
│     ├─ store/              Zustand-сторы (данные с API)
│     ├─ lib/                api-клиент, resources (запросы + маппинг)
│     └─ styles/             SCSS-токены и глобальные стили
│  ├─ Dockerfile · nginx.conf   прод-сборка (nginx + SPA-фолбэк)
├─ backend/                  Django-проект
│  ├─ config/                настройки, urls (DRF-роутер)
│  ├─ apps/                  accounts, workspaces, tasks, notes
│  └─ Dockerfile             прод-образ (gunicorn)
├─ docker-compose.yml        Postgres для разработки (порт 5433)
├─ docker-compose.prod.yml   прод-стек: db + backend + frontend
└─ .github/workflows/ci.yml  CI (линтеры, типы, сборка, тесты)
```

## Запуск (разработка)

**1. База данных** (нужен запущенный Docker Desktop):

```bash
docker compose up -d
```

**2. Backend:**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r requirements.txt -r requirements-dev.txt
copy .env.example .env            # при первом запуске
python manage.py migrate
python manage.py createsuperuser  # создаст пользователя + сид (пространства, категории)
python manage.py runserver
```

API: <http://localhost:8000/api/health/> · Админка: <http://localhost:8000/admin/>

**3. Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Приложение: <http://localhost:5173> (запросы к `/api` проксируются на Django).

## Локальный запуск «в одну кнопку»

Весь проект (БД + бэкенд + фронт) одной командой, без `.env` и ручных шагов —
удобно, если просто нужно пользоваться приложением локально:

```bash
docker compose -f docker-compose.local.yml up -d --build
```

Открыть: <http://localhost:3000>. Дальше в **Docker Desktop** проект `calendar`
появится в списке — запуск/остановка кнопками ▶/⏹, пересобирать (`--build`)
нужно только после изменений кода. `restart: unless-stopped` поднимает контейнеры
автоматически при старте Docker Desktop.

## Полезные команды

Frontend: `npm run typecheck` · `npm run lint` · `npm run build`
Backend: `ruff check apps config` · `black apps config` · `python manage.py test`

## Деплой

Готовый стек в `docker-compose.prod.yml` (Postgres + Django/gunicorn + фронт на nginx с SPA-фолбэком и прокси `/api` на бэкенд).

1. Рядом с `docker-compose.prod.yml` создай `.env` с прод-значениями
   (см. блок PRODUCTION в `backend/.env.example`): `SECRET_KEY` (сгенерируй!),
   `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, при разных
   доменах фронта/бэка — `*_COOKIE_SAMESITE=None`.
2. Запуск:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Фронт будет на `WEB_PORT` (по умолчанию 8080). TLS/домен — через внешний
обратный прокси (или платформу). В проде включаются secure-куки и HSTS.

### Что стоит доделать перед публичным запуском
- Управляемый PostgreSQL + бэкапы (вместо контейнера с данными).
- Мониторинг ошибок (Sentry) и логирование.
- PWA (манифест + service worker, офлайн-режим).
