import { defineConfig, devices } from '@playwright/test';

// E2E: настоящий Django (SQLite, отдельная БД e2e-db.sqlite3 — dev/прод-данные
// не трогаются) + Vite dev-сервер с прокси на него.
//   npm run e2e                — прогнать всё
//   npm run e2e -- --headed    — смотреть в браузере
//   npm run e2e:ui             — интерактивный режим
// Браузер: локально берётся установленный Chrome (PW_CHANNEL=chrome по умолчанию,
// можно msedge). В CI — встроенный Chromium: `npx playwright install chromium`.

const isWin = process.platform === 'win32';
const PYTHON =
  process.env.E2E_PYTHON ?? (isWin ? '.venv\\Scripts\\python.exe' : '.venv/bin/python');
const API_PORT = 8001;
const WEB_PORT = 5174;
const WEB_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 7_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_URL,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // видео требует ffmpeg (npx playwright install ffmpeg) — по умолчанию только в CI
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.CI ? undefined : (process.env.PW_CHANNEL ?? 'chrome'),
      },
    },
  ],
  webServer: [
    {
      command: `${PYTHON} manage.py migrate --noinput && ${PYTHON} manage.py runserver 127.0.0.1:${API_PORT} --noreload`,
      cwd: '../backend',
      url: `http://127.0.0.1:${API_PORT}/api/health/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DEBUG: 'True',
        SECRET_KEY: 'e2e-not-secret',
        DATABASE_URL: 'sqlite:///e2e-db.sqlite3',
        ALLOWED_HOSTS: 'localhost,127.0.0.1',
        CSRF_TRUSTED_ORIGINS: `${WEB_URL},http://127.0.0.1:${WEB_PORT}`,
        CORS_ALLOWED_ORIGINS: `${WEB_URL},http://127.0.0.1:${WEB_PORT}`,
        // каждый тест регистрирует пользователя — лимиты попыток для e2e снимаем
        THROTTLE_LOGIN: '1000/min',
        THROTTLE_REGISTER: '1000/min',
      },
    },
    {
      command: 'npx vite --config e2e/vite.e2e.config.ts',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
