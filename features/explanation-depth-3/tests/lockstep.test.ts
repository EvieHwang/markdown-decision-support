// @frozen (behaviors) — the richer engine must not break the F1/F2 contract. The two entry
// paths still agree (`evaluateClass(generateProductClass(seed)).candidates` deep-equals
// `buildCandidates(seed)`), every candidate now carries a valid reason and a finite compound
// severity, and candidates stay ordered by that severity. The import paths are provisional
// (per F1/F2 headers); the assertions are the contract.
import { describe, it, expect } from 'vitest';
import { buildCandidates, evaluateClass } from '@/pipeline';
import { generateProductClass } from '@/data';

const ARCHETYPES = ['seasonal-cliff', 'inventory-depth', 'decelerating', 'never-started', 'behind-plan'];

describe('F1↔F2↔F3 lockstep under the enriched engine', () => {
  it('keeps the two entry paths in lockstep for every seed', () => {
    for (const seed of [1, 7, 42]) {
      expect(evaluateClass(generateProductClass(seed)).candidates).toEqual(buildCandidates(seed));
    }
  });

  it('gives every candidate a valid reason archetype', () => {
    for (const seed of [1, 7, 42]) {
      for (const c of buildCandidates(seed)) {
        expect(ARCHETYPES).toContain(c.reason);
      }
    }
  });

  it('keeps candidates ordered by a finite compound severity, most severe first', () => {
    for (const seed of [1, 7, 42]) {
      const sevs = buildCandidates(seed).map((c) => c.severity);
      for (const s of sevs) expect(Number.isFinite(s)).toBe(true);
      expect(sevs).toEqual([...sevs].sort((a, b) => b - a));
    }
  });

  it('still surfaces the gap-in-points and weeks-remaining in every explanation', () => {
    for (const c of buildCandidates(42)) {
      expect(c.explanation).toMatch(new RegExp(`\\b${c.gapPoints}\\s*(?:pts|points)\\b`));
      expect(c.explanation).toMatch(new RegExp(`\\b${c.weeksRemaining}\\s*(?:wk|wks|week|weeks)\\b`));
    }
  });
});
