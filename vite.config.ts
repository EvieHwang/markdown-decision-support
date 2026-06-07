/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// `@/` resolves to `src/`. The Vitest `include` glob picks up both colocated
// `src` tests and the per-feature suites under `features/*/tests/` (the
// constitution's single-runner Test-root contract).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'features/**/tests/**/*.{test,spec}.{ts,tsx}',
    ],
  },
});
