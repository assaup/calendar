# Проект: Планер

Личный аналог Asana: календарь + канбан-доска + список задач + заметки + панель статистики.
Задача — одна сущность, видна во всех представлениях. Данные разделены по «доскам» (workspaces),
у каждого пользователя свои.

## Стек

- **Frontend** (`frontend/`): React 19 + TypeScript + Vite, Mantine, SCSS-модули, Zustand, React Router, dnd-kit, Tiptap.
- **Backend** (`backend/`): Django 5 + DRF, gunicorn, WhiteNoise, django-environ (настройки из env).
- **БД**: PostgreSQL 16. В тестах и e2e — SQLite.

## Где что

```
backend/
  config/      settings.py (всё из env), urls.py (DRF-роутер, /api/health/)
  apps/        accounts (User, auth), workspaces (доски, категории), tasks (задачи, подзадачи), notes (заметки, папки)
  Dockerfile   образ бэка (python:3.11-slim + gunicorn)
frontend/
  src/features/   экраны: calendar, board, todo, notes, dashboard, auth, tasks, theme
  src/store/      Zustand-сторы, src/lib/ — api-клиент и запросы
  e2e/            Playwright (+ сценарий скриншотов для README)
  Dockerfile, nginx.conf   сборка на node, раздача через nginx
docker-compose.yml        Postgres для разработки (проект planner-dev, порт 5433)
docker-compose.local.yml  весь стек локально (проект calendar, порт 3000)
.github/workflows/ci.yml  CI
```

## Запуск и проверки

- Весь стек: `docker compose -f docker-compose.local.yml up -d --build` → http://localhost:3000
- Разработка: `docker compose up -d` (БД) + `python manage.py runserver` + `npm run dev` (5173, прокси /api → 8000).
- Бэк: `python manage.py test`, `ruff check apps config`. Venv: `backend/.venv`.
- Фронт: `npm test`, `npm run typecheck`, `npm run lint`, `npm run e2e`.
