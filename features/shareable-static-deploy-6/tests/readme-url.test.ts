// @frozen — AC4.1: the live Pages URL must be captured in README.md so it is a durable,
// handable link rather than something to reconstruct from the repo name each time.
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const LIVE_URL = 'https://eviehwang.github.io/markdown-decision-support/';

describe('README carries the live Pages URL', () => {
  it('README.md contains the deployed site URL', () => {
    const text = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
    expect(text).toContain(LIVE_URL);
  });
});
