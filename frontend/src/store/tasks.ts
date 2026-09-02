import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';

// ------------------------------------------------------------------
// Общее хранилище задач и категорий.
// Пока данные живут в браузере (localStorage). На Этапе 1-2 заменим
// эти действия на запросы к Django-бэкенду — интерфейс останется тем же.
// ------------------------------------------------------------------

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Category {
  id: string;
  name: string;
  color: string; // hex, например '#44639f'
}

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  categoryId: string | null;
  status: TaskStatus;
  startDate: string | null; // 'YYYY-MM-DD'
  dueDate: string | null; // 'YYYY-MM-DD'
  createdAt: number;
}

export interface NewTaskInput {
  workspaceId: string;
  title?: string;
  description?: string;
  categoryId?: string | null;
  status?: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
}

interface TasksState {
  categories: Category[];
  tasks: Task[];
  addTask: (input: NewTaskInput) => string;
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => void;
  deleteTask: (id: string) => void;
  toggleDone: (id: string) => void;
  addCategory: (name: string, color: string) => string;
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => void;
  deleteCategory: (id: string) => void;
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// --- Стартовые данные ------------------------------------------------------
const seedCategories: Category[] = [
  { id: 'cat-work', name: 'Работа', color: '#4c6ef5' },
  { id: 'cat-home', name: 'Дом', color: '#2f9e44' },
  { id: 'cat-meet', name: 'Встречи', color: '#9c36b5' },
  { id: 'cat-life', name: 'Быт', color: '#e8590c' },
];

const d = (offsetDays: number) =>
  dayjs().add(offsetDays, 'day').format('YYYY-MM-DD');

const seedTasks: Task[] = [
  {
    id: uid(),
    workspaceId: 'personal',
    title: 'Купить продукты',
    description: 'Молоко, хлеб, кофе',
    categoryId: 'cat-home',
    status: 'todo',
    startDate: d(0),
    dueDate: d(0),
    createdAt: Date.now(),
  },
  {
    id: uid(),
    workspaceId: 'personal',
    title: 'Оплатить интернет',
    description: '',
    categoryId: 'cat-life',
    status: 'todo',
    startDate: d(3),
    dueDate: d(3),
    createdAt: Date.now(),
  },
  {
    id: uid(),
    workspaceId: 'work',
    title: 'Смонтировать ролик',
    description: 'Черновой монтаж + цветокор',
    categoryId: 'cat-work',
    status: 'in_progress',
    startDate: d(1),
    dueDate: d(4),
    createdAt: Date.now(),
  },
  {
    id: uid(),
    workspaceId: 'work',
    title: 'Созвон с командой',
    description: '',
    categoryId: 'cat-meet',
    status: 'todo',
    startDate: d(2),
    dueDate: d(2),
    createdAt: Date.now(),
  },
];

export const useTasksStore = create<TasksState>()(
  persist(
    (set) => ({
      categories: seedCategories,
      tasks: seedTasks,

      addTask: (input) => {
        const id = uid();
        const task: Task = {
          id,
          workspaceId: input.workspaceId,
          title: input.title ?? 'Новая задача',
          description: input.description ?? '',
          categoryId: input.categoryId ?? null,
          status: input.status ?? 'todo',
          startDate: input.startDate ?? null,
          dueDate: input.dueDate ?? null,
          createdAt: Date.now(),
        };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return id;
      },

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      toggleDone: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, status: t.status === 'done' ? 'todo' : 'done' }
              : t,
          ),
        })),

      addCategory: (name, color) => {
        const id = uid();
        set((s) => ({ categories: [...s.categories, { id, name, color }] }));
        return id;
      },

      updateCategory: (id, patch) =>
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        })),

      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          tasks: s.tasks.map((t) =>
            t.categoryId === id ? { ...t, categoryId: null } : t,
          ),
        })),
    }),
    { name: 'tasks-store' },
  ),
);
