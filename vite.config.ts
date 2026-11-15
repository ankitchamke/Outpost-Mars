import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      phaser: 'phaser/dist/phaser.js',
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
} as any);
