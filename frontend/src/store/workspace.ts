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
}

// На этапе 0 список — заглушка. Позже будет приходить с бэкенда.
const seed: Workspace[] = [
  { id: 'personal', name: 'Личное', color: '#2f9e44' },
  { id: 'work', name: 'Работа', color: '#44639f' },
];

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaces: seed,
      activeId: 'personal',
      setActive: (id) => set({ activeId: id }),
    }),
    { name: 'workspace-store' },
  ),
);
