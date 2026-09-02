import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Простые заметки (как в телефоне). Пока хранятся в браузере.
export interface Note {
  id: string;
  workspaceId: string;
  title: string;
  body: string;
  updatedAt: number;
}

interface NotesState {
  notes: Note[];
  addNote: (workspaceId: string) => string;
  updateNote: (
    id: string,
    patch: Partial<Pick<Note, 'title' | 'body'>>,
  ) => void;
  deleteNote: (id: string) => void;
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const seed: Note[] = [
  {
    id: uid(),
    workspaceId: 'personal',
    title: 'Список покупок',
    body: '<ul><li>Молоко</li><li>Хлеб</li><li>Кофе</li><li>Овсянка</li></ul>',
    updatedAt: Date.now(),
  },
  {
    id: uid(),
    workspaceId: 'work',
    title: 'Идеи для роликов',
    body: '<p>Разбор трендов</p><p>Короткие форматы</p><p>Интро на 3 секунды</p>',
    updatedAt: Date.now(),
  },
];

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: seed,

      addNote: (workspaceId) => {
        const id = uid();
        set((s) => ({
          notes: [
            { id, workspaceId, title: '', body: '', updatedAt: Date.now() },
            ...s.notes,
          ],
        }));
        return id;
      },

      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
          ),
        })),

      deleteNote: (id) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
    }),
    { name: 'notes-store' },
  ),
);
