import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1600,   // Phaser alone is ~1.2 MB
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        prototype: resolve(import.meta.dirname, 'prototype.html'),
      },
    },
  },
});
