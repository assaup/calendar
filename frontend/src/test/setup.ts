import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

// как в main.tsx: неделя с понедельника, русские месяцы
dayjs.locale('ru');

// --- jsdom не умеет того, что нужно Mantine ---
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(window as unknown as { ResizeObserver: unknown }).ResizeObserver ??=
  ResizeObserverStub;
// Textarea autosize подписывается на document.fonts
if (!('fonts' in document)) {
  Object.defineProperty(document, 'fonts', {
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn(), ready: Promise.resolve() },
  });
}
Element.prototype.scrollIntoView ??= vi.fn();
window.HTMLElement.prototype.scrollTo ??= vi.fn();

afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    /* noop */
  }
});
