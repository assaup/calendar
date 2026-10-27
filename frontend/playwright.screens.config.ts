import { defineConfig, devices } from '@playwright/test';

// Скриншоты для README (e2e/readme.shots.ts) на демо-данных.
//   npm run screenshots   -> картинки в docs/screenshots/
// Своя чистая SQLite-база (backend/screens-db.sqlite3, пересоздаётся при
// каждом запуске) и свои порты — dev/e2e-данные и серверы не трогаются.

const isWin = process.platform === 'win32';
const PYTHON =
  process.env.E2E_PYTHON ??
  (isWin ? '.venv\\Scripts\\python.exe' : '.venv/bin/python');
const API_PORT = 8002;
const WEB_PORT = 5175;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const DB = 'screens-db.sqlite3';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.shots.ts',
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    channel: process.env.CI ? undefined : (process.env.PW_CHANNEL ?? 'chrome'),
    baseURL: WEB_URL,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    viewport: { width: 1440, height: 900 },
  },
  webServer: [
    {
      // база пересоздаётся при каждом запуске (удалять её в самом конфиге нельзя:
      // Playwright загружает конфиг несколько раз)
      command: `${PYTHON} -c "import os; os.path.exists('${DB}') and os.remove('${DB}')" && ${PYTHON} manage.py migrate --noinput && ${PYTHON} manage.py runserver 127.0.0.1:${API_PORT} --noreload`,
      cwd: '../backend',
      url: `http://127.0.0.1:${API_PORT}/api/health/`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DEBUG: 'True',
        SECRET_KEY: 'screens-not-secret',
        DATABASE_URL: `sqlite:///${DB}`,
        ALLOWED_HOSTS: 'localhost,127.0.0.1',
        CSRF_TRUSTED_ORIGINS: `${WEB_URL},http://127.0.0.1:${WEB_PORT}`,
        CORS_ALLOWED_ORIGINS: `${WEB_URL},http://127.0.0.1:${WEB_PORT}`,
      },
    },
    {
      command: 'npx vite --config e2e/vite.e2e.config.ts',
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { E2E_WEB_PORT: String(WEB_PORT), E2E_API_PORT: String(API_PORT) },
    },
  ],
});
