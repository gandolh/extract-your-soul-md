import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Code shared between the server (src/) and the SPA (frontend/src/) lives in
// src/shared/ and is imported via '@shared/…' from both roots.
const sharedDir = fileURLToPath(new URL('./src/shared', import.meta.url));

// The SPA lives in frontend/; the built output lands in dist/public, which the
// Fastify server serves in production. In dev, Vite (5173) proxies /api to the
// Fastify dev server (4317) so the browser sees a single origin (cookies work).
export default defineConfig({
  root: 'frontend',
  resolve: {
    alias: { '@shared': sharedDir },
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Allow importing from src/shared/, which sits above the frontend root.
    fs: { allow: ['..'] },
    proxy: {
      '/api': { target: 'http://localhost:4317', changeOrigin: true },
    },
  },
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
  },
});
