// @frozen — AC3.1: the existing CI quality gate must stay intact and the deploy must be
// additive. CI must still run the test suite AND the production build on both push to main
// and pull requests to main. This guards against the deploy work cannibalizing or weakening
// the gate (e.g. dropping the build step, or narrowing triggers).
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const ciPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');

describe('CI quality gate remains intact', () => {
  const text = fs.existsSync(ciPath) ? fs.readFileSync(ciPath, 'utf8') : '';

  it('ci.yml exists', () => {
    expect(fs.existsSync(ciPath)).toBe(true);
  });

  it('runs the test suite and the production build', () => {
    expect(text).toMatch(/pnpm test/);
    expect(text).toMatch(/pnpm build/);
  });

  it('triggers on push to main and on pull requests to main', () => {
    expect(text).toMatch(/push:/);
    expect(text).toMatch(/pull_request:/);
    expect(text).toMatch(/branches:\s*\[?\s*main/);
  });
});
