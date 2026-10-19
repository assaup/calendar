import { vi } from 'vitest';
import type { Task, Category, NewTaskInput } from '../store/tasks';
import type { Note, NoteFolder } from '../store/notes';
import type { Workspace } from '../store/workspace';

// Подмена слоя запросов (src/lib/resources.ts) для unit-тестов сторов и
// компонентов. Подключается так:
//   vi.mock('../../lib/resources', () => import('../../test/resourcesMock'));
// create/update возвращают то, что вернул бы сервер.

let seq = 1000;
export const nextId = () => String((seq += 1));

export const workspacesApi = {
  list: vi.fn(async (): Promise<Workspace[]> => []),
  create: vi.fn(
    async (name: string, color: string): Promise<Workspace> => ({
      id: nextId(),
      name,
      color,
    }),
  ),
  update: vi.fn(async (id: string, patch: Partial<Workspace>) => ({
    id,
    name: '',
    color: '',
    ...patch,
  })),
  remove: vi.fn(async (_id: string): Promise<void> => {}),
};

export const categoriesApi = {
  list: vi.fn(async (): Promise<Category[]> => []),
  create: vi.fn(
    async (name: string, color: string, workspaceId: string): Promise<Category> => ({
      id: nextId(),
      name,
      color,
      workspaceId,
    }),
  ),
  update: vi.fn(async (id: string, patch: Partial<Category>) => ({
    id,
    name: '',
    color: '',
    workspaceId: '',
    ...patch,
  })),
  remove: vi.fn(async (_id: string): Promise<void> => {}),
};

export const tasksApi = {
  list: vi.fn(async (): Promise<Task[]> => []),
  create: vi.fn(
    async (input: Partial<Task> & NewTaskInput): Promise<Task> => ({
      id: nextId(),
      workspaceId: input.workspaceId,
      title: input.title ?? '',
      description: input.description ?? '',
      categoryId: input.categoryId ?? null,
      status: input.status ?? 'todo',
      priority: input.priority ?? null,
      subtasks: (input.subtasks ?? []).map((s) => ({ ...s, id: nextId() })),
      startDate: input.startDate ?? null,
      dueDate: input.dueDate ?? null,
      createdAt: Date.now(),
    }),
  ),
  update: vi.fn(async (id: string, patch: Partial<Task>) => ({ id, ...patch })),
  setPosition: vi.fn(async (_id: string, _position: number): Promise<void> => {}),
  remove: vi.fn(async (_id: string): Promise<void> => {}),
};

export const foldersApi = {
  list: vi.fn(async (): Promise<NoteFolder[]> => []),
  create: vi.fn(
    async (workspaceId: string, name: string): Promise<NoteFolder> => ({
      id: nextId(),
      workspaceId,
      name,
    }),
  ),
  update: vi.fn(async (id: string, patch: { name?: string }) => ({
    id,
    workspaceId: '',
    name: '',
    ...patch,
  })),
  remove: vi.fn(async (_id: string): Promise<void> => {}),
};

export const notesApi = {
  list: vi.fn(async (): Promise<Note[]> => []),
  create: vi.fn(
    async (workspaceId: string, folderId: string | null): Promise<Note> => ({
      id: nextId(),
      workspaceId,
      folderId,
      title: '',
      body: '',
      isPinned: false,
      updatedAt: Date.now(),
    }),
  ),
  update: vi.fn(async (id: string, patch: Partial<Note>) => ({ id, ...patch })),
  remove: vi.fn(async (_id: string): Promise<void> => {}),
};
