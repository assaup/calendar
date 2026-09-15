import { create } from 'zustand';

// Маленькое всплывающее меню категорий, которое открывается клавишей C
// над карточкой (без открытия всей задачи).
interface QuickCategoryState {
  taskId: string | null;
  x: number;
  y: number;
  open: (taskId: string, x: number, y: number) => void;
  close: () => void;
}

export const useQuickCategory = create<QuickCategoryState>()((set) => ({
  taskId: null,
  x: 0,
  y: 0,
  open: (taskId, x, y) => set({ taskId, x, y }),
  close: () => set({ taskId: null }),
}));
