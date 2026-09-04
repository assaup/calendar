import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { workspacesApi } from '../lib/resources';

export interface Workspace {
  id: string;
  name: string;
  color: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeId: string;
  setActive: (id: string) => void;
  hydrate: (items: Workspace[]) => void;
  addWorkspace: (name: string, color: string) => Promise<string>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeId: '',

      setActive: (id) => set({ activeId: id }),

      hydrate: (items) =>
        set((s) => {
          const activeId =
            items.some((w) => w.id === s.activeId) && s.activeId
              ? s.activeId
              : (items[0]?.id ?? '');
          return { workspaces: items, activeId };
        }),

      addWorkspace: async (name, color) => {
        const w = await workspacesApi.create(name, color);
        set((s) => ({ workspaces: [...s.workspaces, w], activeId: w.id }));
        return w.id;
      },

      renameWorkspace: async (id, name) => {
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === id ? { ...w, name } : w,
          ),
        }));
        await workspacesApi.update(id, { name });
      },

      deleteWorkspace: async (id) => {
        const { workspaces, activeId } = get();
        if (workspaces.length <= 1) return;
        const next = workspaces.filter((w) => w.id !== id);
        set({
          workspaces: next,
          activeId: activeId === id ? next[0].id : activeId,
        });
        await workspacesApi.remove(id);
      },
    }),
    {
      name: 'workspace-store',
      // храним локально только выбранное пространство, данные — с сервера
      partialize: (s) => ({ activeId: s.activeId }),
    },
  ),
);
