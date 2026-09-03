import { useEffect } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { useThemeStore, mantineSchemeFor } from '../../store/theme';

// Применяет выбранную тему приложения: ставит data-app-theme на <html>
// (управляет нашими CSS-токенами) и синхронизирует светлую/тёмную схему Mantine.
export function ThemeSync() {
  const theme = useThemeStore((s) => s.theme);
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    document.documentElement.setAttribute('data-app-theme', theme);
    setColorScheme(mantineSchemeFor(theme));
  }, [theme, setColorScheme]);

  return null;
}
