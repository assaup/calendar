import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Масштаб текста задач в календаре */
export type CalendarScale = 's' | 'm' | 'l';

// Состояние интерфейса, которое хочется помнить между запусками.
interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /** календарь: показывать название задачи целиком (с переносом строк) */
  calendarFullText: boolean;
  setCalendarFullText: (v: boolean) => void;
  calendarScale: CalendarScale;
  setCalendarScale: (v: CalendarScale) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      calendarFullText: false,
      setCalendarFullText: (v) => set({ calendarFullText: v }),
      calendarScale: 'm',
      setCalendarScale: (v) => set({ calendarScale: v }),
    }),
    { name: 'ui-store' },
  ),
);
