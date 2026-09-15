import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Состояние интерфейса, которое хочется помнить между запусками.
interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'ui-store' },
  ),
);
