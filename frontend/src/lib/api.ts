import axios, { isAxiosError } from 'axios';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../features/auth/useAuth';
import { fetchMe } from '../features/auth/api';

// Через Vite-прокси запросы идут на тот же origin (/api -> Django).
const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  // Django CSRF: берём токен из cookie 'csrftoken' и шлём в заголовке
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  headers: { 'Content-Type': 'application/json' },
});

// ------------------------------------------------------------------
// Уход со страницы: браузер обрывает обычные запросы при закрытии вкладки.
// Пока страница выгружается, шлём через fetch с keepalive — так успевает
// дописаться отложенное сохранение заметки.
// ------------------------------------------------------------------
const KEEPALIVE_LIMIT = 60_000; // у keepalive лимит тела запроса ~64 КБ
let unloading = false;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => (unloading = true));
  window.addEventListener('pagehide', () => (unloading = true));
  window.addEventListener('pageshow', () => (unloading = false));
}

api.interceptors.request.use(
  (config) => {
    const size = config.data ? JSON.stringify(config.data).length : 0;
    if (unloading && size < KEEPALIVE_LIMIT) {
      config.adapter = 'fetch';
      config.fetchOptions = { ...config.fetchOptions, keepalive: true };
    }
    return config;
  },
  undefined,
  // синхронно — чтобы запрос ушёл ещё до выгрузки страницы
  { synchronous: true },
);

// ------------------------------------------------------------------
// Истёкшая сессия: на 401/403 переспрашиваем /auth/me/. Если сервер нас
// не знает — показываем экран входа (403 бывает и по другим причинам,
// например CSRF, поэтому по одному ответу не разлогиниваем).
// ------------------------------------------------------------------
let sessionCheck: Promise<void> | null = null;

async function verifySession() {
  if (useAuth.getState().status !== 'authed') return;
  try {
    await fetchMe();
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    if (status !== 401 && status !== 403) return; // сеть упала — не выкидываем
    useAuth.setState({ user: null, status: 'anon' });
    notifications.show({
      color: 'orange',
      message: 'Сессия истекла — войди снова.',
    });
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    const url = isAxiosError(error) ? (error.config?.url ?? '') : '';
    // ответы самих /auth/* (неверный пароль, me для гостя) не трогаем
    if ((status === 401 || status === 403) && !url.includes('/auth/')) {
      sessionCheck ??= verifySession().finally(() => {
        sessionCheck = null;
      });
      await sessionCheck;
    }
    return Promise.reject(error);
  },
);
