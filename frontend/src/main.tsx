import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

// Mantine base styles (must come before our own overrides)
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/tiptap/styles.css';

// Русская локализация дат
dayjs.locale('ru');

// Our global SCSS (design tokens, resets, custom variables you can edit)
import './styles/global.scss';

import { theme } from './theme';
import { queryClient } from './lib/queryClient';
import { router } from './router';
import { AuthGate } from './features/auth/AuthGate';
import { ThemeSync } from './features/theme/ThemeSync';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <ThemeSync />
      <QueryClientProvider client={queryClient}>
        <DatesProvider settings={{ locale: 'ru', firstDayOfWeek: 1 }}>
          <ModalsProvider>
            <Notifications position="top-right" />
            <AuthGate>
              <RouterProvider router={router} />
            </AuthGate>
          </ModalsProvider>
        </DatesProvider>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
