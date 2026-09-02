import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Проксируем запросы к API на Django — один origin, куки и CSRF работают проще
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
