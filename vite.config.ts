import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
