import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('./api', () => ({ api: http }));

import {
  categoriesApi,
  foldersApi,
  notesApi,
  tasksApi,
  workspacesApi,
} from './resources';

const srvTask = {
  id: 7,
  workspace: 1,
  category: 3,
  title: 'T',
  description: 'D',
  status: 'in_progress',
  priority: 'high',
  start_date: '2026-10-01',
  due_date: '2026-10-03',
  position: 0,
  subtasks: [{ id: 9, title: 's', done: true }],
  created_at: '2026-10-01T09:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resources: маппинг сервер <-> клиент', () => {
  it('tasks.list: snake_case и числовые id -> camelCase и строки', async () => {
    http.get.mockResolvedValue({ data: [srvTask] });
    const [t] = await tasksApi.list();
    expect(http.get).toHaveBeenCalledWith('/tasks/');
    expect(t).toEqual({
      id: '7',
      workspaceId: '1',
      categoryId: '3',
      title: 'T',
      description: 'D',
      status: 'in_progress',
      priority: 'high',
      subtasks: [{ id: '9', title: 's', done: true }],
      startDate: '2026-10-01',
      dueDate: '2026-10-03',
      createdAt: Date.parse('2026-10-01T09:00:00Z'),
    });
  });

  it('tasks.list: category=null и отсутствующие subtasks', async () => {
    http.get.mockResolvedValue({
      data: [{ ...srvTask, category: null, subtasks: undefined }],
    });
    const [t] = await tasksApi.list();
    expect(t.categoryId).toBeNull();
    expect(t.subtasks).toEqual([]);
  });

  it('tasks.create: тело запроса — только переданные поля, id в числа', async () => {
    http.post.mockResolvedValue({ data: srvTask });
    await tasksApi.create({
      workspaceId: '1',
      title: 'T',
      categoryId: null,
      startDate: '2026-10-01',
      subtasks: [{ id: 'local-uuid', title: 's', done: false }],
    });
    expect(http.post).toHaveBeenCalledWith('/tasks/', {
      workspace: 1,
      category: null,
      title: 'T',
      start_date: '2026-10-01',
      // клиентские id подзадач на сервер не уходят
      subtasks: [{ title: 's', done: false }],
    });
  });

  it('tasks.update: PATCH c частичным телом; категория строкой -> число', async () => {
    http.patch.mockResolvedValue({ data: srvTask });
    await tasksApi.update('7', { categoryId: '3', dueDate: null });
    expect(http.patch).toHaveBeenCalledWith('/tasks/7/', {
      category: 3,
      due_date: null,
    });
  });

  it('tasks.setPosition / remove', async () => {
    http.patch.mockResolvedValue({});
    http.delete.mockResolvedValue({});
    await tasksApi.setPosition('7', 4);
    await tasksApi.remove('7');
    expect(http.patch).toHaveBeenCalledWith('/tasks/7/', { position: 4 });
    expect(http.delete).toHaveBeenCalledWith('/tasks/7/');
  });

  it('workspaces / categories', async () => {
    http.post.mockResolvedValueOnce({
      data: { id: 5, name: 'Стройка', color: '#000000', position: 2 },
    });
    expect(await workspacesApi.create('Стройка', '#000000')).toEqual({
      id: '5',
      name: 'Стройка',
      color: '#000000',
    });

    http.post.mockResolvedValueOnce({
      data: { id: 8, workspace: 5, name: 'Кровля', color: '#111111' },
    });
    await categoriesApi.create('Кровля', '#111111', '5');
    expect(http.post).toHaveBeenLastCalledWith('/categories/', {
      name: 'Кровля',
      color: '#111111',
      workspace: 5,
    });
  });

  it('notes: folderId/isPinned -> folder/is_pinned', async () => {
    http.patch.mockResolvedValue({
      data: {
        id: 1,
        workspace: 1,
        folder: null,
        title: '',
        body: '',
        is_pinned: true,
        updated_at: '2026-10-01T00:00:00Z',
      },
    });
    const n = await notesApi.update('1', { folderId: null, isPinned: true });
    expect(http.patch).toHaveBeenCalledWith('/notes/1/', {
      folder: null,
      is_pinned: true,
    });
    expect(n.isPinned).toBe(true);
    expect(n.folderId).toBeNull();
  });

  it('folders.create', async () => {
    http.post.mockResolvedValue({
      data: { id: 3, workspace: 2, name: 'Идеи', position: 0 },
    });
    expect(await foldersApi.create('2', 'Идеи')).toEqual({
      id: '3',
      workspaceId: '2',
      name: 'Идеи',
    });
    expect(http.post).toHaveBeenCalledWith('/folders/', { workspace: 2, name: 'Идеи' });
  });
});
