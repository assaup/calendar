import { mergeConfig } from 'vite';
import base from '../vite.config.ts';

// Vite для e2e: свой порт и прокси на e2e-бэкенд (8001), чтобы не пересекаться
// с dev-сервером (5173 -> 8000) и dev-базой.
export default mergeConfig(base, {
  server: {
    port: 5174,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8001' },
  },
});
