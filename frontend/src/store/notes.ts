import { create } from 'zustand';
import { notesApi } from '../lib/resources';

export interface Note {
  id: string;
  workspaceId: string;
  title: string;
  body: string;
  updatedAt: number;
}

interface NotesState {
  notes: Note[];
  hydrate: (items: Note[]) => void;
  addNote: (workspaceId: string) => Promise<string>;
  updateNote: (
    id: string,
    patch: Partial<Pick<Note, 'title' | 'body'>>,
  ) => void;
  deleteNote: (id: string) => Promise<void>;
}

// Дебаунс сохранения заметки на сервер (автосейв на каждую букву не шлём).
const pending = new Map<string, ReturnType<typeof setTimeout>>();
function scheduleSave(
  id: string,
  patch: Partial<Pick<Note, 'title' | 'body'>>,
) {
  const existing = pending.get(id);
  if (existing) clearTimeout(existing);
  pending.set(
    id,
    setTimeout(() => {
      pending.delete(id);
      void notesApi.update(id, patch);
    }, 600),
  );
}

export const useNotesStore = create<NotesState>()((set, get) => ({
  notes: [],

  hydrate: (items) => set({ notes: items }),

  addNote: async (workspaceId) => {
    const note = await notesApi.create(workspaceId);
    set((s) => ({ notes: [note, ...s.notes] }));
    return note.id;
  },

  updateNote: (id, patch) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
      ),
    }));
    // сохраняем весь текущий title+body (чтобы не потерять другое поле)
    const note = get().notes.find((n) => n.id === id);
    if (note) scheduleSave(id, { title: note.title, body: note.body });
  },

  deleteNote: async (id) => {
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    await notesApi.remove(id);
  },
}));
