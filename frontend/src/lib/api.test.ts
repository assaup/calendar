import { beforeEach, describe, expect, it } from 'vitest';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { api } from './api';
import { useAuth } from '../features/auth/useAuth';

function respondWith(status: number) {
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    if (status < 400) {
      return { data: {}, status, statusText: 'OK', headers: {}, config };
    }
    throw new AxiosError('fail', String(status), config, null, {
      data: { detail: 'Учетные данные не были предоставлены.' },
      status,
      statusText: '',
      headers: {},
      config,
    });
  };
}

beforeEach(() => {
  useAuth.setState({ user: { id: 1, email: 'a@e.com', name: '' }, status: 'authed' });
});

describe('api client', () => {
  it('настроен на Django CSRF и куки', () => {
    expect(api.defaults.baseURL).toBe('/api');
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.xsrfCookieName).toBe('csrftoken');
    expect(api.defaults.xsrfHeaderName).toBe('X-CSRFToken');
  });

  it('FE-06: 403 «не авторизован» на любом запросе возвращает на экран входа', async () => {
    // сессия истекла (SESSION_COOKIE_AGE) — сейчас приложение остаётся открытым,
    // все запросы молча падают, оптимистичные изменения теряются
    respondWith(403);
    await api.get('/tasks/').catch(() => {});
    expect(useAuth.getState().status).toBe('anon');
  });

  it('успешный ответ статус авторизации не трогает', async () => {
    respondWith(200);
    await api.get('/tasks/');
    expect(useAuth.getState().status).toBe('authed');
  });
});
