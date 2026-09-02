import { api } from '../../lib/api';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me/');
  return data;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>('/auth/login/', {
    email,
    password,
  });
  return data;
}

export async function registerRequest(
  email: string,
  password: string,
  name: string,
): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>('/auth/register/', {
    email,
    password,
    name,
  });
  return data;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout/');
}
