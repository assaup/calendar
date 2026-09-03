import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';

// ------------------------------------------------------------------
// Общее хранилище задач и категорий.
// Пока данные живут в браузере (localStorage). На Этапе 1-2 заменим
// эти действия на запросы к Django-бэкенду — интерфейс останется тем же.
// ------------------------------------------------------------------

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';

// Метаданные приоритетов (для флажков, фильтров, сортировки).
export const PRIORITY_META: Record<
  Priority,
  { label: string; color: string; order: number }
> = {
  high: { label: 'Высокий', color: '#e03131', order: 0 },
  medium: { label: 'Средний', color: '#f08c00', order: 1 },
  low: { label: 'Низкий', color: '#4c6ef5', order: 2 },
};

export interface Category {
  id: string;
  name: string;
  color: string; // hex, например '#44639f'
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
  priority?: Priority | null;
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
  // переставить задачу в общем списке (для порядка внутри дня и колонок)
  moveTask: (activeId: string, overId: string) => void;
  // подзадачи
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  deleteSubtask: (taskId: string, subId: string) => void;
  addCategory: (name: string, color: string) => string;
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => void;
  deleteCategory: (id: string) => void;
}

// Задача просрочена: есть срок, он в прошлом и она не выполнена.
export function isOverdue(task: Task): boolean {
  return (
    !!task.dueDate &&
    task.status !== 'done' &&
    dayjs(task.dueDate).isBefore(dayjs(), 'day')
  );
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// --- Стартовые данные ------------------------------------------------------
const seedCategories: Category[] = [
  { id: 'cat-work', name: 'Работа', color: '#478bff' },
  { id: 'cat-home', name: 'Дом', color: '#5ec974' },
  { id: 'cat-meet', name: 'Встречи', color: '#9068fd' },
  { id: 'cat-life', name: 'Быт', color: '#eb8f7f' },
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
    priority: 'medium',
    subtasks: [
      { id: uid(), title: 'Молоко', done: true },
      { id: uid(), title: 'Хлеб', done: false },
      { id: uid(), title: 'Кофе', done: false },
    ],
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
    priority: 'high',
    subtasks: [],
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
    priority: 'high',
    subtasks: [
      { id: uid(), title: 'Черновой монтаж', done: true },
      { id: uid(), title: 'Цветокор', done: false },
      { id: uid(), title: 'Титры', done: false },
    ],
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
    priority: 'low',
    subtasks: [],
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
          priority: input.priority ?? null,
          subtasks: [],
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

      moveTask: (activeId, overId) =>
        set((s) => {
          const from = s.tasks.findIndex((t) => t.id === activeId);
          const to = s.tasks.findIndex((t) => t.id === overId);
          if (from < 0 || to < 0 || from === to) return s;
          return { tasks: arrayMove(s.tasks, from, to) };
        }),

      addSubtask: (taskId, title) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: [
                    ...(t.subtasks ?? []),
                    { id: uid(), title, done: false },
                  ],
                }
              : t,
          ),
        })),

      toggleSubtask: (taskId, subId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: (t.subtasks ?? []).map((st) =>
                    st.id === subId ? { ...st, done: !st.done } : st,
                  ),
                }
              : t,
          ),
        })),

      deleteSubtask: (taskId, subId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: (t.subtasks ?? []).filter((st) => st.id !== subId),
                }
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
