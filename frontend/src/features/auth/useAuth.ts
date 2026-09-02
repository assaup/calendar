import { create } from 'zustand';
import {
  fetchMe,
  loginRequest,
  logoutRequest,
  registerRequest,
  type AuthUser,
} from './api';

type Status = 'loading' | 'authed' | 'anon';

interface AuthState {
  user: AuthUser | null;
  status: Status;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'loading',

  init: async () => {
    try {
      const user = await fetchMe();
      set({ user, status: 'authed' });
    } catch {
      set({ user: null, status: 'anon' });
    }
  },

  login: async (email, password) => {
    const user = await loginRequest(email, password);
    set({ user, status: 'authed' });
  },

  register: async (email, password, name) => {
    const user = await registerRequest(email, password, name);
    set({ user, status: 'authed' });
  },

  logout: async () => {
    await logoutRequest();
    set({ user: null, status: 'anon' });
  },
}));
