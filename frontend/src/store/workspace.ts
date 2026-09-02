import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Workspace {
  id: string;
  name: string;
  color: string; // акцентный цвет пространства
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeId: string;
  setActive: (id: string) => void;
  addWorkspace: (name: string, color: string) => string;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => void;
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// Стартовые пространства.
const seed: Workspace[] = [
  { id: 'personal', name: 'Личное', color: '#2b8a3e' },
  { id: 'work', name: 'Работа', color: '#364fc7' },
];

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaces: seed,
      activeId: 'personal',

      setActive: (id) => set({ activeId: id }),

      addWorkspace: (name, color) => {
        const id = uid();
        set((s) => ({
          workspaces: [...s.workspaces, { id, name, color }],
          activeId: id,
        }));
        return id;
      },

      renameWorkspace: (id, name) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === id ? { ...w, name } : w,
          ),
        })),

      deleteWorkspace: (id) =>
        set((s) => {
          // нельзя удалить последнее пространство
          if (s.workspaces.length <= 1) return s;
          const workspaces = s.workspaces.filter((w) => w.id !== id);
          const activeId = s.activeId === id ? workspaces[0].id : s.activeId;
          return { workspaces, activeId };
        }),
    }),
    { name: 'workspace-store' },
  ),
);
