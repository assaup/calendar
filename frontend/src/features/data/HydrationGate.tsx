import { useEffect, useState, type ReactNode } from 'react';
import { Center, Loader, Stack, Text, Button } from '@mantine/core';
import {
  workspacesApi,
  categoriesApi,
  tasksApi,
  notesApi,
} from '../../lib/resources';
import { useWorkspaceStore } from '../../store/workspace';
import { useTasksStore } from '../../store/tasks';
import { useNotesStore } from '../../store/notes';

// Загружает данные пользователя с сервера в сторы и показывает лоадер,
// пока идёт загрузка. Рендерится уже после авторизации (AuthGate).
export function HydrationGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const hydrateWs = useWorkspaceStore((s) => s.hydrate);
  const hydrateTasks = useTasksStore((s) => s.hydrate);
  const hydrateNotes = useNotesStore((s) => s.hydrate);

  useEffect(() => {
    let alive = true;
    setState('loading');
    (async () => {
      try {
        const [ws, cats, tasks, notes] = await Promise.all([
          workspacesApi.list(),
          categoriesApi.list(),
          tasksApi.list(),
          notesApi.list(),
        ]);
        if (!alive) return;
        hydrateWs(ws);
        hydrateTasks({ categories: cats, tasks });
        hydrateNotes(notes);
        setState('ready');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [hydrateWs, hydrateTasks, hydrateNotes]);

  if (state === 'error') {
    return (
      <Center h="70vh">
        <Stack align="center" gap="sm">
          <Text c="dimmed">Не удалось загрузить данные.</Text>
          <Button onClick={() => window.location.reload()}>Обновить</Button>
        </Stack>
      </Center>
    );
  }
  if (state === 'loading') {
    return (
      <Center h="70vh">
        <Loader />
      </Center>
    );
  }
  return <>{children}</>;
}
