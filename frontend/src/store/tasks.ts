import { create } from 'zustand';
import dayjs from 'dayjs';
import { tasksApi, categoriesApi } from '../lib/resources';

// ------------------------------------------------------------------
// Хранилище задач и категорий. Данные — с сервера (Django DRF).
// Мутации оптимистичны: сначала меняем локально, затем шлём запрос.
// ------------------------------------------------------------------

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export const PRIORITY_META: Record<
  Priority,
  { label: string; color: string; order: number }
> = {
  high: { label: 'Высокий', color: '#e03131', order: 0 },
  medium: { label: 'Средний', color: '#f08c00', order: 1 },
  low: { label: 'Низкий', color: '#868e96', order: 2 },
};

export interface Category {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
}

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  categoryId: string | null;
  status: TaskStatus;
  priority: Priority | null;
  subtasks: SubTask[];
  startDate: string | null;
  dueDate: string | null;
  createdAt: number;
}

export interface NewTaskInput {
  workspaceId: string;
  title?: string;
  description?: string;
  categoryId?: string | null;
  status?: TaskStatus;
  priority?: Priority | null;
  startDate?: string | null;
  dueDate?: string | null;
}

interface TasksState {
  categories: Category[];
  tasks: Task[];
  hydrate: (data: { categories: Category[]; tasks: Task[] }) => void;
  addTask: (input: NewTaskInput) => Promise<string>;
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  moveTask: (activeId: string, overId: string) => void;
  addCategory: (
    name: string,
    color: string,
    workspaceId: string,
  ) => Promise<string>;
  updateCategory: (
    id: string,
    patch: Partial<Omit<Category, 'id'>>,
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function isOverdue(task: Task): boolean {
  return (
    !!task.dueDate &&
    task.status !== 'done' &&
    dayjs(task.dueDate).isBefore(dayjs(), 'day')
  );
}

export const useTasksStore = create<TasksState>()((set, get) => ({
  categories: [],
  tasks: [],

  hydrate: ({ categories, tasks }) => set({ categories, tasks }),

  addTask: async (input) => {
    const task = await tasksApi.create({
      workspaceId: input.workspaceId,
      title: input.title ?? 'Новая задача',
      description: input.description ?? '',
      categoryId: input.categoryId ?? null,
      status: input.status ?? 'todo',
      priority: input.priority ?? null,
      startDate: input.startDate ?? null,
      dueDate: input.dueDate ?? null,
    });
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task.id;
  },

  updateTask: async (id, patch) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
    await tasksApi.update(id, patch);
  },

  deleteTask: async (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    await tasksApi.remove(id);
  },

  toggleDone: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const status: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
    await tasksApi.update(id, { status });
  },

  moveTask: (activeId, overId) => {
    const tasks = get().tasks;
    const from = tasks.findIndex((t) => t.id === activeId);
    const to = tasks.findIndex((t) => t.id === overId);
    if (from < 0 || to < 0 || from === to) return;
    const next = arrayMove(tasks, from, to);
    set({ tasks: next });
    // сохраняем порядок: обновляем position у сдвинутого диапазона
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    for (let i = lo; i <= hi; i += 1) {
      void tasksApi.setPosition(next[i].id, i);
    }
  },

  addCategory: async (name, color, workspaceId) => {
    const cat = await categoriesApi.create(name, color, workspaceId);
    set((s) => ({ categories: [...s.categories, cat] }));
    return cat.id;
  },

  updateCategory: async (id, patch) => {
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    }));
    await categoriesApi.update(id, patch);
  },

  deleteCategory: async (id) => {
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      tasks: s.tasks.map((t) =>
        t.categoryId === id ? { ...t, categoryId: null } : t,
      ),
    }));
    await categoriesApi.remove(id);
  },
}));
