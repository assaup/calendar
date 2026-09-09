import { create } from 'zustand';
import { notesApi, foldersApi } from '../lib/resources';

export interface NoteFolder {
  id: string;
  workspaceId: string;
  name: string;
}

export interface Note {
  id: string;
  workspaceId: string;
  folderId: string | null;
  title: string;
  body: string;
  isPinned: boolean;
  updatedAt: number;
}

interface NotesState {
  notes: Note[];
  folders: NoteFolder[];
  hydrate: (data: { notes: Note[]; folders: NoteFolder[] }) => void;
  addNote: (workspaceId: string, folderId: string | null) => Promise<string>;
  updateNote: (
    id: string,
    patch: Partial<Pick<Note, 'title' | 'body'>>,
  ) => void;
  deleteNote: (id: string) => Promise<void>;
  moveNote: (id: string, folderId: string | null) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  addFolder: (workspaceId: string, name: string) => Promise<string>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
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
  folders: [],

  hydrate: ({ notes, folders }) => set({ notes, folders }),

  addNote: async (workspaceId, folderId) => {
    const note = await notesApi.create(workspaceId, folderId);
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

  moveNote: async (id, folderId) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, folderId } : n)),
    }));
    await notesApi.update(id, { folderId });
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const isPinned = !note.isPinned;
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, isPinned } : n)),
    }));
    await notesApi.update(id, { isPinned });
  },

  addFolder: async (workspaceId, name) => {
    const folder = await foldersApi.create(workspaceId, name);
    set((s) => ({ folders: [...s.folders, folder] }));
    return folder.id;
  },

  renameFolder: async (id, name) => {
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    }));
    await foldersApi.update(id, { name });
  },

  deleteFolder: async (id) => {
    // заметки из папки не удаляем — они становятся «без папки»
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      notes: s.notes.map((n) =>
        n.folderId === id ? { ...n, folderId: null } : n,
      ),
    }));
    await foldersApi.remove(id);
  },
}));
