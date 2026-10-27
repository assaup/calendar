import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

const authApi = vi.hoisted(() => ({
  fetchMe: vi.fn(),
  loginRequest: vi.fn(),
  registerRequest: vi.fn(),
  logoutRequest: vi.fn(),
}));
vi.mock('./api', () => authApi);

import { useAuth } from './useAuth';

const USER = { id: 1, email: 'a@e.com', name: 'A' };
const state = () => useAuth.getState();

function httpError(status: number) {
  return new AxiosError('fail', String(status), undefined, undefined, {
    status,
    statusText: '',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ user: null, status: 'loading' });
});

describe('useAuth', () => {
  it('init: есть сессия -> authed', async () => {
    authApi.fetchMe.mockResolvedValue(USER);
    await state().init();
    expect(state()).toMatchObject({ status: 'authed', user: USER });
  });

  it('init: 401 -> anon', async () => {
    authApi.fetchMe.mockRejectedValue(httpError(401));
    await state().init();
    expect(state()).toMatchObject({ status: 'anon', user: null });
  });

  it('login / register ставят пользователя', async () => {
    authApi.loginRequest.mockResolvedValue(USER);
    await state().login('a@e.com', 'p');
    expect(state().user).toEqual(USER);
    useAuth.setState({ user: null, status: 'anon' });
    authApi.registerRequest.mockResolvedValue(USER);
    await state().register('a@e.com', 'p', 'A');
    expect(authApi.registerRequest).toHaveBeenCalledWith('a@e.com', 'p', 'A');
    expect(state().status).toBe('authed');
  });

  it('неудачный login оставляет anon и пробрасывает ошибку для формы', async () => {
    useAuth.setState({ status: 'anon' });
    authApi.loginRequest.mockRejectedValue(httpError(400));
    await expect(state().login('a@e.com', 'bad')).rejects.toBeInstanceOf(AxiosError);
    expect(state().status).toBe('anon');
  });

  it('logout -> anon', async () => {
    useAuth.setState({ user: USER, status: 'authed' });
    authApi.logoutRequest.mockResolvedValue(undefined);
    await state().logout();
    expect(state()).toMatchObject({ status: 'anon', user: null });
  });

  it('FE-05: logout при истёкшей сессии (403) всё равно разлогинивает локально', async () => {
    useAuth.setState({ user: USER, status: 'authed' });
    authApi.logoutRequest.mockRejectedValue(httpError(403));
    await state()
      .logout()
      .catch(() => {});
    expect(state().status).toBe('anon');
  });
});
