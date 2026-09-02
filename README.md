# Планер

Личный аналог Asana: **календарь + доска (канбан) + список задач + заметки**.
Задача — единая сущность: одна запись видна в календаре, на доске и в списке.
Разделение «Работа / Личное» через рабочие пространства (workspaces).

## Стек

| Слой | Технологии |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite, Mantine (UI), SCSS-модули, TanStack Query, Zustand, React Router, dnd-kit |
| Backend | Django 5 + Django REST Framework |
| БД | PostgreSQL |
| Линтеры | oxlint, Prettier, Stylelint (front) · Ruff, Black, mypy (back) |

Мобильная версия — адаптивный веб + PWA. Тёмная и светлая темы.

## Структура

```
calendar/
├─ frontend/            React-приложение
│  └─ src/
│     ├─ components/    layout (сайдбар, темы) и общие UI
│     ├─ features/      calendar, board, todo, notes
│     ├─ store/         Zustand (активное пространство)
│     ├─ lib/           api-клиент, react-query
│     └─ styles/        SCSS-токены и глобальные стили (правь тут)
├─ backend/             Django-проект
│  ├─ config/           настройки, urls
│  └─ apps/             accounts, workspaces, projects, tasks, notes
└─ docker-compose.yml   PostgreSQL
```

## Запуск (разработка)

### 1. База данных

Нужен запущенный **Docker Desktop**, затем:

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate           # Windows
pip install -r requirements.txt -r requirements-dev.txt
copy .env.example .env           # при первом запуске
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API: <http://localhost:8000/api/health/> · Админка: <http://localhost:8000/admin/>

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Приложение: <http://localhost:5173>

## Полезные команды

Frontend: `npm run typecheck` · `npm run lint` · `npm run lint:styles` · `npm run format`
Backend: `ruff check .` · `black .` · `mypy .`

## Дорожная карта

- [x] **Этап 0.** Каркас: структура, темы, линтеры, БД, layout
- [ ] **Этап 1.** Аккаунт + рабочие пространства
- [ ] **Этап 2.** Проекты + доска (drag-and-drop)
- [ ] **Этап 3.** Календарь
- [ ] **Этап 4.** Список задач + фильтры
- [ ] **Этап 5.** Заметки
- [ ] **Этап 6.** PWA + офлайн
- [ ] **Этап 7.** Desktop-обёртка
