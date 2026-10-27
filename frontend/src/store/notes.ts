import { create } from 'zustand';
import { notesApi, foldersApi } from '../lib/resources';
import { notifyError } from '../lib/notify';
import { reinsert, restoreFields } from '../lib/optimistic';

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
type NotePatch = Partial<Pick<Note, 'title' | 'body'>>;
const pending = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; patch: NotePatch }
>();

function saveNow(id: string, patch: NotePatch) {
  notesApi
    .update(id, patch)
    .catch((error) => notifyError('Заметка не сохранилась.', error));
}

function scheduleSave(id: string, patch: NotePatch) {
  cancelSave(id);
  const timer = setTimeout(() => {
    pending.delete(id);
    saveNow(id, patch);
  }, 600);
  pending.set(id, { timer, patch });
}

function cancelSave(id: string) {
  const entry = pending.get(id);
  if (entry) clearTimeout(entry.timer);
  pending.delete(id);
}

/** Сразу отправить все отложенные сохранения (уход со страницы). */
export function flushPendingSaves() {
  for (const [id, { timer, patch }] of pending) {
    clearTimeout(timer);
    pending.delete(id);
    saveNow(id, patch);
  }
}

// закрытие/перезагрузка вкладки — дописываем то, что ещё ждёт дебаунса
// (запрос уйдёт с keepalive, см. lib/api.ts)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingSaves);
  window.addEventListener('pagehide', flushPendingSaves);
}

export const useNotesStore = create<NotesState>()((set, get) => ({
  notes: [],
  folders: [],

  hydrate: ({ notes, folders }) => set({ notes, folders }),

  addNote: async (workspaceId, folderId) => {
    try {
      const note = await notesApi.create(workspaceId, folderId);
      set((s) => ({ notes: [note, ...s.notes] }));
      return note.id;
    } catch (error) {
      notifyError('Заметка не создалась.', error);
      throw error;
    }
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
    // отложенное сохранение удалённой заметки дало бы PATCH -> 404
    cancelSave(id);
    const index = get().notes.findIndex((n) => n.id === id);
    const prev = get().notes[index];
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    try {
      await notesApi.remove(id);
    } catch (error) {
      if (prev) set((s) => ({ notes: reinsert(s.notes, prev, index) }));
      notifyError('Заметка не удалилась.', error);
    }
  },

  moveNote: async (id, folderId) => {
    const prev = get().notes.find((n) => n.id === id);
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, folderId } : n)),
    }));
    try {
      await notesApi.update(id, { folderId });
    } catch (error) {
      if (prev) {
        set((s) => ({ notes: restoreFields(s.notes, id, prev, ['folderId']) }));
      }
      notifyError('Заметка не переместилась.', error);
    }
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const isPinned = !note.isPinned;
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, isPinned } : n)),
    }));
    try {
      await notesApi.update(id, { isPinned });
    } catch (error) {
      set((s) => ({ notes: restoreFields(s.notes, id, note, ['isPinned']) }));
      notifyError('Закрепление не сохранилось.', error);
    }
  },

  addFolder: async (workspaceId, name) => {
    try {
      const folder = await foldersApi.create(workspaceId, name);
      set((s) => ({ folders: [...s.folders, folder] }));
      return folder.id;
    } catch (error) {
      notifyError('Папка не создалась.', error);
      throw error;
    }
  },

  renameFolder: async (id, name) => {
    const prev = get().folders.find((f) => f.id === id);
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    }));
    try {
      await foldersApi.update(id, { name });
    } catch (error) {
      if (prev) {
        set((s) => ({ folders: restoreFields(s.folders, id, prev, ['name']) }));
      }
      notifyError('Папка не переименовалась.', error);
    }
  },

  deleteFolder: async (id) => {
    const index = get().folders.findIndex((f) => f.id === id);
    const prev = get().folders[index];
    const inFolder = get()
      .notes.filter((n) => n.folderId === id)
      .map((n) => n.id);
    // заметки из папки не удаляем — они становятся «без папки»
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      notes: s.notes.map((n) =>
        n.folderId === id ? { ...n, folderId: null } : n,
      ),
    }));
    try {
      await foldersApi.remove(id);
    } catch (error) {
      if (prev) {
        set((s) => ({
          folders: reinsert(s.folders, prev, index),
          notes: s.notes.map((n) =>
            inFolder.includes(n.id) ? { ...n, folderId: id } : n,
          ),
        }));
      }
      notifyError('Папка не удалилась.', error);
    }
  },
}));
