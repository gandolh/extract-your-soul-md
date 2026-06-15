import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The SPA lives in frontend/; the built output lands in dist/public, which the
// Fastify server serves in production. In dev, Vite (5173) proxies /api to the
// Fastify dev server (4317) so the browser sees a single origin (cookies work).
export default defineConfig({
  root: 'frontend',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4317', changeOrigin: true },
    },
  },
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
  },
});
