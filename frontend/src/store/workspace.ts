import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { workspacesApi, categoriesApi } from '../lib/resources';
import { notifyError } from '../lib/notify';
import { reinsert, restoreFields } from '../lib/optimistic';
import { useTasksStore } from './tasks';
import { useNotesStore } from './notes';

export interface Workspace {
  id: string;
  name: string;
  color: string;
}

/** Особый «выбор» в переключателе: задачи всех досок вместе */
export const ALL_WORKSPACES = 'all';

interface WorkspaceState {
  workspaces: Workspace[];
  /** id доски или ALL_WORKSPACES */
  activeId: string;
  /** последняя выбранная настоящая доска — в неё создаём задачи и заметки
   *  в режиме «Все доски» */
  homeId: string;
  setActive: (id: string) => void;
  hydrate: (items: Workspace[]) => void;
  addWorkspace: (name: string, color: string) => Promise<string>;
  updateWorkspace: (
    id: string,
    patch: Partial<Pick<Workspace, 'name' | 'color'>>,
  ) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeId: '',
      homeId: '',

      setActive: (id) =>
        set(
          id === ALL_WORKSPACES
            ? { activeId: id }
            : { activeId: id, homeId: id },
        ),

      hydrate: (items) =>
        set((s) => {
          const exists = (id: string) => items.some((w) => w.id === id);
          const fallback = items[0]?.id ?? '';
          const homeId = exists(s.homeId)
            ? s.homeId
            : exists(s.activeId)
              ? s.activeId
              : fallback;
          const activeId =
            s.activeId === ALL_WORKSPACES || exists(s.activeId)
              ? s.activeId
              : homeId;
          return { workspaces: items, activeId, homeId };
        }),

      addWorkspace: async (name, color) => {
        let w: Workspace;
        try {
          w = await workspacesApi.create(name, color);
        } catch (error) {
          notifyError('Доска не создалась.', error);
          throw error;
        }
        set((s) => ({
          workspaces: [...s.workspaces, w],
          activeId: w.id,
          homeId: w.id,
        }));
        // сервер сразу кладёт в новую доску базовые категории — подтягиваем их
        try {
          const cats = await categoriesApi.list();
          useTasksStore.setState((s) => ({
            categories: [
              ...s.categories.filter((c) => c.workspaceId !== w.id),
              ...cats.filter((c) => c.workspaceId === w.id),
            ],
          }));
        } catch {
          // не страшно: категории появятся после перезагрузки
        }
        return w.id;
      },

      updateWorkspace: async (id, patch) => {
        const prev = get().workspaces.find((w) => w.id === id);
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === id ? { ...w, ...patch } : w,
          ),
        }));
        try {
          await workspacesApi.update(id, patch);
        } catch (error) {
          if (prev) {
            set((s) => ({
              workspaces: restoreFields(
                s.workspaces,
                id,
                prev,
                Object.keys(patch),
              ),
            }));
          }
          notifyError('Доска не сохранилась.', error);
        }
      },

      deleteWorkspace: async (id) => {
        const { workspaces, activeId, homeId } = get();
        if (workspaces.length <= 1) return;
        const index = workspaces.findIndex((w) => w.id === id);
        if (index < 0) return;
        const next = workspaces.filter((w) => w.id !== id);
        const nextHome = homeId === id ? next[0].id : homeId;
        set({
          workspaces: next,
          activeId: activeId === id ? nextHome : activeId,
          homeId: nextHome,
        });

        // на сервере всё содержимое доски удаляется каскадом — убираем и
        // локально, иначе оно остаётся видно в «Все доски»
        const tasksBefore = useTasksStore.getState();
        const notesBefore = useNotesStore.getState();
        useTasksStore.setState({
          tasks: tasksBefore.tasks.filter((t) => t.workspaceId !== id),
          categories: tasksBefore.categories.filter(
            (c) => c.workspaceId !== id,
          ),
        });
        useNotesStore.setState({
          notes: notesBefore.notes.filter((n) => n.workspaceId !== id),
          folders: notesBefore.folders.filter((f) => f.workspaceId !== id),
        });

        try {
          await workspacesApi.remove(id);
        } catch (error) {
          set((s) => ({
            workspaces: reinsert(s.workspaces, workspaces[index], index),
            activeId: s.activeId === nextHome ? activeId : s.activeId,
            homeId,
          }));
          useTasksStore.setState((s) => ({
            tasks: [
              ...s.tasks,
              ...tasksBefore.tasks.filter((t) => t.workspaceId === id),
            ],
            categories: [
              ...s.categories,
              ...tasksBefore.categories.filter((c) => c.workspaceId === id),
            ],
          }));
          useNotesStore.setState((s) => ({
            notes: [
              ...s.notes,
              ...notesBefore.notes.filter((n) => n.workspaceId === id),
            ],
            folders: [
              ...s.folders,
              ...notesBefore.folders.filter((f) => f.workspaceId === id),
            ],
          }));
          notifyError('Доска не удалилась.', error);
        }
      },
    }),
    {
      name: 'workspace-store',
      // храним локально только выбор доски, данные — с сервера
      partialize: (s) => ({ activeId: s.activeId, homeId: s.homeId }),
    },
  ),
);

/**
 * Что сейчас показываем:
 *  - isAll — режим «Все доски»;
 *  - targetId — куда создавать новое (в «Все доски» — последняя доска);
 *  - inScope — попадает ли сущность доски в текущий показ.
 */
export function useWorkspaceScope() {
  const activeId = useWorkspaceStore((s) => s.activeId);
  const homeId = useWorkspaceStore((s) => s.homeId);
  const isAll = activeId === ALL_WORKSPACES;
  return {
    isAll,
    targetId: isAll ? homeId : activeId,
    inScope: (workspaceId: string) => isAll || workspaceId === activeId,
  };
}

/** Доска по id (для подписей в режиме «Все доски») */
export function useWorkspace(id: string | null | undefined) {
  return useWorkspaceStore((s) => s.workspaces.find((w) => w.id === id));
}
