import { mergeConfig } from 'vite';
import base from '../vite.config.ts';

// Vite для e2e: свой порт и прокси на e2e-бэкенд (8001), чтобы не пересекаться
// с dev-сервером (5173 -> 8000) и dev-базой. Порты можно переопределить
// (так делает конфиг скриншотов).
const webPort = Number(process.env.E2E_WEB_PORT ?? 5174);
const apiPort = Number(process.env.E2E_API_PORT ?? 8001);

export default mergeConfig(base, {
  server: {
    port: webPort,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${apiPort}` },
  },
});
