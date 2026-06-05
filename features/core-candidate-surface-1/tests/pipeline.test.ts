// @frozen — the pipeline output is the feature's externally-observable contract.
// /build must satisfy these behaviors as written. Field names on Candidate are
// part of this contract (feature #2 recomputes against the same shape).
import { describe, it, expect } from 'vitest';
import { buildCandidates } from '@/pipeline';

const SEED = 42;

describe('buildCandidates — pipeline output contract', () => {
  it('is deterministic: same seed produces a deep-equal candidate list', () => {
    const a = buildCandidates(SEED);
    const b = buildCandidates(SEED);
    expect(a).toEqual(b);
  });

  it('returns at least one candidate (the generator guarantees something is behind)', () => {
    const candidates = buildCandidates(SEED);
    expect(candidates.length).toBeGreaterThan(0);
  });

  it('includes only CCs that are behind plan (gap above zero)', () => {
    for (const c of buildCandidates(SEED)) {
      expect(c.gapPoints).toBeGreaterThan(0);
    }
  });

  it('orders candidates by severity, most severe first', () => {
    const sevs = buildCandidates(SEED).map((c) => c.severity);
    const sorted = [...sevs].sort((x, y) => y - x);
    expect(sevs).toEqual(sorted);
  });

  it('never recommends a tier whose discounted price falls below the liquidation floor', () => {
    for (const c of buildCandidates(SEED)) {
      expect(c.discountedPrice).toBeGreaterThanOrEqual(c.liquidationFloor);
    }
  });

  it('uses only the three defined tiers with the fixed label-to-percent correspondence', () => {
    const map: Record<string, number> = { First: 15, Second: 25, Clearance: 40 };
    for (const c of buildCandidates(SEED)) {
      expect(Object.keys(map)).toContain(c.tier);
      expect(c.discountPct).toBe(map[c.tier]);
      expect(c.discountedPrice).toBeCloseTo(c.price * (1 - c.discountPct / 100), 6);
    }
  });

  it('reports the sell-through gap as integer points (round(gap * 100))', () => {
    for (const c of buildCandidates(SEED)) {
      expect(Number.isInteger(c.gapPoints)).toBe(true);
      expect(c.gapPoints).toBeGreaterThan(0);
    }
  });

  it('gives every candidate a non-empty explanation that states the gap (in points) and weeks remaining', () => {
    for (const c of buildCandidates(SEED)) {
      expect(c.explanation.trim().length).toBeGreaterThan(0);
      // Phrase-anchored so a coincidental digit overlap can't satisfy the check:
      // the explanation must state this candidate's actual gap-in-points and weeks-remaining
      // next to their units, not just contain those digits somewhere.
      expect(c.explanation).toMatch(new RegExp(`\\b${c.gapPoints}\\s*(?:pts|points)\\b`));
      expect(c.explanation).toMatch(new RegExp(`\\b${c.weeksRemaining}\\s*(?:wk|wks|week|weeks)\\b`));
    }
  });
});
