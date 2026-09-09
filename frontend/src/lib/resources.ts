import { api } from './api';
import type { Workspace } from '../store/workspace';
import type {
  Task,
  Category,
  SubTask,
  TaskStatus,
  Priority,
} from '../store/tasks';
import type { Note, NoteFolder } from '../store/notes';

// ------------------------------------------------------------------
// Слой запросов к API + маппинг между серверной (snake_case, числовые id,
// start_date/due_date) и клиентской (camelCase, строковые id) формой.
// ------------------------------------------------------------------

const sid = (v: number | string) => String(v);

// ---------- Workspaces ----------
interface SrvWorkspace {
  id: number;
  name: string;
  color: string;
  position: number;
}
const mapWorkspace = (w: SrvWorkspace): Workspace => ({
  id: sid(w.id),
  name: w.name,
  color: w.color,
});

export const workspacesApi = {
  async list(): Promise<Workspace[]> {
    const { data } = await api.get<SrvWorkspace[]>('/workspaces/');
    return data.map(mapWorkspace);
  },
  async create(name: string, color: string): Promise<Workspace> {
    const { data } = await api.post<SrvWorkspace>('/workspaces/', {
      name,
      color,
    });
    return mapWorkspace(data);
  },
  async update(id: string, patch: Partial<{ name: string; color: string }>) {
    const { data } = await api.patch<SrvWorkspace>(`/workspaces/${id}/`, patch);
    return mapWorkspace(data);
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/workspaces/${id}/`);
  },
};

// ---------- Categories ----------
interface SrvCategory {
  id: number;
  workspace: number;
  name: string;
  color: string;
}
const mapCategory = (c: SrvCategory): Category => ({
  id: sid(c.id),
  workspaceId: sid(c.workspace),
  name: c.name,
  color: c.color,
});

export const categoriesApi = {
  async list(): Promise<Category[]> {
    const { data } = await api.get<SrvCategory[]>('/categories/');
    return data.map(mapCategory);
  },
  async create(
    name: string,
    color: string,
    workspaceId: string,
  ): Promise<Category> {
    const { data } = await api.post<SrvCategory>('/categories/', {
      name,
      color,
      workspace: Number(workspaceId),
    });
    return mapCategory(data);
  },
  async update(id: string, patch: Partial<{ name: string; color: string }>) {
    const { data } = await api.patch<SrvCategory>(`/categories/${id}/`, patch);
    return mapCategory(data);
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/categories/${id}/`);
  },
};

// ---------- Tasks ----------
interface SrvSubTask {
  id: number;
  title: string;
  done: boolean;
}
interface SrvTask {
  id: number;
  workspace: number;
  category: number | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority | null;
  start_date: string | null;
  due_date: string | null;
  position: number;
  subtasks: SrvSubTask[];
  created_at: string;
}

const mapSubTask = (s: SrvSubTask): SubTask => ({
  id: sid(s.id),
  title: s.title,
  done: s.done,
});

const mapTask = (t: SrvTask): Task => ({
  id: sid(t.id),
  workspaceId: sid(t.workspace),
  categoryId: t.category === null ? null : sid(t.category),
  title: t.title,
  description: t.description,
  status: t.status,
  priority: t.priority,
  subtasks: (t.subtasks ?? []).map(mapSubTask),
  startDate: t.start_date,
  dueDate: t.due_date,
  createdAt: Date.parse(t.created_at) || Date.now(),
});

// поля задачи -> тело запроса на сервер
function taskToBody(t: Partial<Task>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (t.workspaceId !== undefined) body.workspace = Number(t.workspaceId);
  if (t.categoryId !== undefined)
    body.category = t.categoryId === null ? null : Number(t.categoryId);
  if (t.title !== undefined) body.title = t.title;
  if (t.description !== undefined) body.description = t.description;
  if (t.status !== undefined) body.status = t.status;
  if (t.priority !== undefined) body.priority = t.priority;
  if (t.startDate !== undefined) body.start_date = t.startDate;
  if (t.dueDate !== undefined) body.due_date = t.dueDate;
  if (t.subtasks !== undefined)
    body.subtasks = t.subtasks.map((s) => ({ title: s.title, done: s.done }));
  return body;
}

export const tasksApi = {
  async list(): Promise<Task[]> {
    const { data } = await api.get<SrvTask[]>('/tasks/');
    return data.map(mapTask);
  },
  async create(input: Partial<Task>): Promise<Task> {
    const { data } = await api.post<SrvTask>('/tasks/', taskToBody(input));
    return mapTask(data);
  },
  async update(id: string, patch: Partial<Task>): Promise<Task> {
    const { data } = await api.patch<SrvTask>(
      `/tasks/${id}/`,
      taskToBody(patch),
    );
    return mapTask(data);
  },
  async setPosition(id: string, position: number): Promise<void> {
    await api.patch(`/tasks/${id}/`, { position });
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/tasks/${id}/`);
  },
};

// ---------- Note folders ----------
interface SrvFolder {
  id: number;
  workspace: number;
  name: string;
  position: number;
}
const mapFolder = (f: SrvFolder): NoteFolder => ({
  id: sid(f.id),
  workspaceId: sid(f.workspace),
  name: f.name,
});

export const foldersApi = {
  async list(): Promise<NoteFolder[]> {
    const { data } = await api.get<SrvFolder[]>('/folders/');
    return data.map(mapFolder);
  },
  async create(workspaceId: string, name: string): Promise<NoteFolder> {
    const { data } = await api.post<SrvFolder>('/folders/', {
      workspace: Number(workspaceId),
      name,
    });
    return mapFolder(data);
  },
  async update(id: string, patch: Partial<{ name: string }>) {
    const { data } = await api.patch<SrvFolder>(`/folders/${id}/`, patch);
    return mapFolder(data);
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/folders/${id}/`);
  },
};

// ---------- Notes ----------
interface SrvNote {
  id: number;
  workspace: number;
  folder: number | null;
  title: string;
  body: string;
  is_pinned: boolean;
  updated_at: string;
}
const mapNote = (n: SrvNote): Note => ({
  id: sid(n.id),
  workspaceId: sid(n.workspace),
  folderId: n.folder === null ? null : sid(n.folder),
  title: n.title,
  body: n.body,
  isPinned: n.is_pinned,
  updatedAt: Date.parse(n.updated_at) || Date.now(),
});

type NotePatch = Partial<{
  title: string;
  body: string;
  folderId: string | null;
  isPinned: boolean;
}>;

function noteToBody(patch: NotePatch): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.body !== undefined) body.body = patch.body;
  if (patch.folderId !== undefined)
    body.folder = patch.folderId === null ? null : Number(patch.folderId);
  if (patch.isPinned !== undefined) body.is_pinned = patch.isPinned;
  return body;
}

export const notesApi = {
  async list(): Promise<Note[]> {
    const { data } = await api.get<SrvNote[]>('/notes/');
    return data.map(mapNote);
  },
  async create(workspaceId: string, folderId: string | null): Promise<Note> {
    const { data } = await api.post<SrvNote>('/notes/', {
      workspace: Number(workspaceId),
      folder: folderId === null ? null : Number(folderId),
      title: '',
      body: '',
    });
    return mapNote(data);
  },
  async update(id: string, patch: NotePatch) {
    const { data } = await api.patch<SrvNote>(`/notes/${id}/`, noteToBody(patch));
    return mapNote(data);
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/notes/${id}/`);
  },
};
