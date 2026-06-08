/**
 * @vitest-environment node
 */
// This file resolves the real Vite config, which makes Vitest transform `vite.config.ts`
// via esbuild. esbuild's TS transform trips a TextEncoder realm check under the default
// jsdom environment, so this file pins the `node` environment (no DOM is needed here).
//
// @frozen — AC1.1 / AC1.2: the production build's base public path must equal the repo's
// GitHub Pages subpath, or the deployed site serves a blank page (HTML loads, but CSS/JS
// resolve to the domain root and 404). The value '/markdown-decision-support/' is the
// external contract — it is the live URL path. HOW base is applied (unconditionally, or
// only for `command === 'build'`) is implementation latitude for /build: this test resolves
// the config in production-build mode and asserts the resulting value, so a command-
// conditional config (the sensible choice, to keep dev/preview at root) still passes.
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// tests -> shareable-static-deploy-6 -> features -> repo root
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const EXPECTED_BASE = '/markdown-decision-support/';

async function resolveProductionBase(): Promise<unknown> {
  const mod: any = await import(path.join(repoRoot, 'vite.config.ts'));
  let config = mod.default ?? mod;
  // Vite config may export an object or a function of the resolved env.
  if (typeof config === 'function') {
    config = await config({ command: 'build', mode: 'production', ssrBuild: false });
  }
  return config?.base;
}

describe('Vite base path for GitHub Pages', () => {
  it('resolves the production base to the repo Pages subpath (leading + trailing slash)', async () => {
    const base = await resolveProductionBase();
    expect(base).toBe(EXPECTED_BASE);
  });
});
