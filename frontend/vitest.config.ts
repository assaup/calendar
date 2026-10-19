import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Unit/компонентные тесты (Vitest + Testing Library, jsdom).
// E2E — отдельно, Playwright: см. playwright.config.ts и папку e2e/.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: false,
      testTimeout: 15_000,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/test/**', 'src/**/*.test.{ts,tsx}', 'src/main.tsx'],
      },
    },
  }),
);
