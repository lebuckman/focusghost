import { defineConfig } from 'vite';

// active-win is ESM-only and contains native .node binaries — must not be bundled
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['active-win', 'electron-store'],
    },
  },
});
