import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';

const authApi = vi.hoisted(() => ({
  fetchMe: vi.fn(),
  loginRequest: vi.fn(),
  registerRequest: vi.fn(),
  logoutRequest: vi.fn(),
}));
vi.mock('./api', () => authApi);

import { AuthScreen } from './AuthScreen';
import { useAuth } from './useAuth';
import { renderWithProviders } from '../../test/utils';

function badRequest(data: unknown) {
  return new AxiosError('fail', '400', undefined, undefined, {
    status: 400,
    statusText: '',
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ user: null, status: 'anon' });
});

describe('AuthScreen', () => {
  it('вход: отправляет email и пароль', async () => {
    const user = userEvent.setup();
    authApi.loginRequest.mockResolvedValue({ id: 1, email: 'a@e.com', name: '' });
    renderWithProviders(<AuthScreen />);
    await user.type(screen.getByLabelText(/Email/), 'a@e.com');
    await user.type(screen.getByLabelText(/Пароль/), 'secret');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(authApi.loginRequest).toHaveBeenCalledWith('a@e.com', 'secret');
    expect(useAuth.getState().status).toBe('authed');
  });

  it('ошибка входа: показывает detail с сервера', async () => {
    const user = userEvent.setup();
    authApi.loginRequest.mockRejectedValue(badRequest({ detail: 'Неверный email или пароль.' }));
    renderWithProviders(<AuthScreen />);
    await user.type(screen.getByLabelText(/Email/), 'a@e.com');
    await user.type(screen.getByLabelText(/Пароль/), 'bad');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByText('Неверный email или пароль.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Войти' })).toBeEnabled();
  });

  it('регистрация: поле имени и первая ошибка поля с сервера', async () => {
    const user = userEvent.setup();
    authApi.registerRequest.mockRejectedValue(
      badRequest({ password: ['Введённый пароль слишком короткий.'] }),
    );
    renderWithProviders(<AuthScreen />);
    expect(screen.queryByLabelText('Имя')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Создать' }));
    await user.type(screen.getByLabelText('Имя'), 'Маша');
    await user.type(screen.getByLabelText(/Email/), 'm@e.com');
    await user.type(screen.getByLabelText(/Пароль/), '1');
    await user.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
    expect(authApi.registerRequest).toHaveBeenCalledWith('m@e.com', '1', 'Маша');
    expect(await screen.findByText('Введённый пароль слишком короткий.')).toBeInTheDocument();
  });

  it('сетевая ошибка — общий текст', async () => {
    const user = userEvent.setup();
    authApi.loginRequest.mockRejectedValue(new Error('Network Error'));
    renderWithProviders(<AuthScreen />);
    await user.type(screen.getByLabelText(/Email/), 'a@e.com');
    await user.type(screen.getByLabelText(/Пароль/), 'x');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByText(/Что-то пошло не так/)).toBeInTheDocument();
  });

  it('переключение режима сбрасывает ошибку', async () => {
    const user = userEvent.setup();
    authApi.loginRequest.mockRejectedValue(badRequest({ detail: 'Ошибка' }));
    renderWithProviders(<AuthScreen />);
    await user.type(screen.getByLabelText(/Email/), 'a@e.com');
    await user.type(screen.getByLabelText(/Пароль/), 'x');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    await screen.findByText('Ошибка');
    await user.click(screen.getByRole('button', { name: 'Создать' }));
    expect(screen.queryByText('Ошибка')).toBeNull();
  });
});
