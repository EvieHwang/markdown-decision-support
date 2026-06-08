// @frozen — AC2.1–2.5: the Pages deploy workflow must trigger on push to `main`, build with
// pnpm, publish via GitHub's official Pages mechanism under the `github-pages` environment,
// hold least-privilege permissions, and run on a GitHub-hosted runner. The action
// identifiers (upload-pages-artifact / deploy-pages) and the `github-pages` environment are
// GitHub's ONLY supported Actions-driven Pages deploy path — naming them asserts the
// external contract, not an internal implementation choice. The workflow FILENAME is not
// part of the contract: the deploy workflow is discovered by what it does (it uses the
// official deploy-pages action), so /build may name the file as it likes.
import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const workflowsDir = path.join(repoRoot, '.github', 'workflows');

function readWorkflows(): string[] {
  if (!fs.existsSync(workflowsDir)) return [];
  return fs
    .readdirSync(workflowsDir)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => fs.readFileSync(path.join(workflowsDir, f), 'utf8'));
}

// The deploy workflow is the one that uses the official Pages deploy action.
function findDeployWorkflow(): string | undefined {
  return readWorkflows().find((text) => /actions\/deploy-pages/.test(text));
}

describe('GitHub Pages deploy workflow', () => {
  let text: string | undefined;
  beforeAll(() => {
    text = findDeployWorkflow();
  });

  it('exists — a workflow uses the official Pages deploy action', () => {
    expect(text, 'no workflow references actions/deploy-pages').toBeDefined();
  });

  it('triggers on push to main', () => {
    expect(text ?? '').toMatch(/push:[\s\S]*?branches:[\s\S]*?main/);
  });

  it('builds the bundle with pnpm before publishing', () => {
    // Must actually INVOKE the production build — not merely contain the word "build"
    // (which a job name, step label, or comment satisfies). A workflow that installs deps
    // but never runs the build would upload a never-produced / stale `dist/` and publish a
    // blank site while staying green. Pin the real command.
    expect(text ?? '').toMatch(/\bpnpm(?: run)? build\b|\bvite build\b/);
  });

  it('uploads a Pages artifact and deploys via the official Pages mechanism', () => {
    expect(text ?? '').toMatch(/actions\/upload-pages-artifact/);
    expect(text ?? '').toMatch(/actions\/deploy-pages/);
  });

  it('declares the github-pages deployment environment', () => {
    expect(text ?? '').toMatch(/github-pages/);
  });

  it('grants exactly the least-privilege Pages permissions (no broad write)', () => {
    expect(text ?? '').toMatch(/pages:\s*write/);
    expect(text ?? '').toMatch(/id-token:\s*write/);
    expect(text ?? '').not.toMatch(/write-all/);
    expect(text ?? '').not.toMatch(/contents:\s*write/);
  });

  it('runs on a GitHub-hosted runner, not the Eviebot self-hosted runner', () => {
    expect(text ?? '').toMatch(/runs-on:\s*ubuntu/);
    expect(text ?? '').not.toMatch(/self-hosted/);
  });
});
