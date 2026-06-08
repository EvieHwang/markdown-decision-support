/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// `@/` resolves to `src/`. The Vitest `include` glob picks up both colocated
// `src` tests and the per-feature suites under `features/*/tests/` (the
// constitution's single-runner Test-root contract).
//
// `base` is the GitHub Pages subpath, applied only for the production build so
// that emitted asset URLs resolve under `/markdown-decision-support/` (without
// it, Pages serves a blank page — HTML loads but CSS/JS 404 at the domain
// root). Dev server and the Vitest run stay at root, so `pnpm dev`/`pnpm test`
// are unaffected.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/markdown-decision-support/' : '/',
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
}));
