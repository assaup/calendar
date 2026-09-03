import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppTheme = 'light' | 'dark' | 'pink';

interface ThemeState {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'pink',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'app-theme' },
  ),
);

// Какую цветовую схему Mantine использовать для темы приложения.
export const mantineSchemeFor = (theme: AppTheme): 'light' | 'dark' =>
  theme === 'dark' ? 'dark' : 'light';
