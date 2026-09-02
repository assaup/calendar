import { create } from 'zustand';

// Состояние модального окна задачи. Открываем из календаря, доски, списка.
interface TaskEditorState {
  opened: boolean;
  editingId: string | null; // null => создаём новую
  presetDate: string | null; // дата по клику в календаре ('YYYY-MM-DD')
  presetStatus: 'todo' | 'in_progress' | 'done' | null;
  openNew: (opts?: {
    date?: string | null;
    status?: 'todo' | 'in_progress' | 'done' | null;
  }) => void;
  openEdit: (id: string) => void;
  close: () => void;
}

export const useTaskEditor = create<TaskEditorState>((set) => ({
  opened: false,
  editingId: null,
  presetDate: null,
  presetStatus: null,
  openNew: (opts) =>
    set({
      opened: true,
      editingId: null,
      presetDate: opts?.date ?? null,
      presetStatus: opts?.status ?? null,
    }),
  openEdit: (id) =>
    set({ opened: true, editingId: id, presetDate: null, presetStatus: null }),
  close: () => set({ opened: false, editingId: null, presetDate: null }),
}));
