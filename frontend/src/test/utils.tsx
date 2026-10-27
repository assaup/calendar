import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { MemoryRouter } from 'react-router-dom';
import { theme } from '../theme';
import { useTasksStore, type Task, type Category } from '../store/tasks';
import { useWorkspaceStore, type Workspace } from '../store/workspace';
import { useNotesStore, type Note, type NoteFolder } from '../store/notes';
import { useTaskEditor } from '../features/tasks/taskEditor';
import { useQuickCategory } from '../features/tasks/quickCategory';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme}>
      <DatesProvider settings={{ locale: 'ru', firstDayOfWeek: 1 }}>
        <ModalsProvider>
          <Notifications />
          {children}
        </ModalsProvider>
      </DatesProvider>
    </MantineProvider>
  );
}

export function renderWithProviders(ui: ReactElement, route = '/') {
  return render(
    <Providers>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </Providers>,
  );
}

// ---------- фикстуры ----------

export const WS_A: Workspace = { id: '1', name: 'Личное', color: '#12992d' };
export const WS_B: Workspace = { id: '2', name: 'Работа', color: '#4263eb' };

let taskSeq = 0;
export function makeTask(patch: Partial<Task> = {}): Task {
  taskSeq += 1;
  return {
    id: `t${taskSeq}`,
    workspaceId: WS_A.id,
    title: `Задача ${taskSeq}`,
    description: '',
    categoryId: null,
    status: 'todo',
    priority: null,
    subtasks: [],
    startDate: null,
    dueDate: null,
    createdAt: taskSeq,
    ...patch,
  };
}

export function makeCategory(patch: Partial<Category> = {}): Category {
  return { id: 'c1', workspaceId: WS_A.id, name: 'Дом', color: '#5ec974', ...patch };
}

export function makeNote(patch: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    workspaceId: WS_A.id,
    folderId: null,
    title: 'Заметка',
    body: '',
    isPinned: false,
    updatedAt: Date.parse('2026-10-01T10:00:00Z'),
    ...patch,
  };
}

interface Seed {
  workspaces?: Workspace[];
  activeId?: string;
  homeId?: string;
  tasks?: Task[];
  categories?: Category[];
  notes?: Note[];
  folders?: NoteFolder[];
}

/** Сбрасывает все zustand-сторы в известное состояние. */
export function seedStores({
  workspaces = [WS_A, WS_B],
  activeId = WS_A.id,
  homeId,
  tasks = [],
  categories = [],
  notes = [],
  folders = [],
}: Seed = {}) {
  homeId ??= activeId === 'all' ? WS_A.id : activeId;
  useWorkspaceStore.setState({ workspaces, activeId, homeId });
  useTasksStore.setState({ tasks, categories });
  useNotesStore.setState({ notes, folders });
  useTaskEditor.setState({
    opened: false,
    editingId: null,
    presetDate: null,
    presetStatus: null,
  });
  useQuickCategory.setState({ taskId: null, x: 0, y: 0 });
}

export const flush = () => new Promise((r) => setTimeout(r, 0));
