// @scaffolding — `generateProductClass`'s name/shape is the F1 provisional seam. The F3
// behaviors: each CC carries a consistent, non-decreasing observed `actualCurve`, and a
// generated class exercises BOTH trajectory shapes (never-started and decelerating) among its
// behind-plan CCs so the vocabulary is real, not theoretical.
import { describe, it, expect } from 'vitest';
import { generateProductClass } from '@/data';

const FLAG_THRESHOLD = 0.05; // F1 contract: behind plan beyond this is flagged.

describe('generateProductClass — the actual trajectory', () => {
  it('is still deterministic in the seed (actual curve included)', () => {
    expect(generateProductClass(7)).toEqual(generateProductClass(7));
  });

  it('gives every CC a non-decreasing observed actual curve, one entry per elapsed week', () => {
    for (const cc of generateProductClass(7)) {
      expect(Array.isArray((cc as { actualCurve?: number[] }).actualCurve)).toBe(true);
      const curve = (cc as { actualCurve: number[] }).actualCurve;
      expect(curve).toHaveLength(cc.weeksElapsed);
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1]);
      }
      for (const v of curve) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps the curve consistent with the current cumulative scalar (last observed = actual now)', () => {
    for (const cc of generateProductClass(7)) {
      const curve = (cc as { actualCurve: number[] }).actualCurve;
      expect(curve[curve.length - 1]).toBeCloseTo(cc.actualCumulativeFraction, 6);
    }
  });

  it('exercises both trajectory shapes among the behind-plan CCs', () => {
    // Among CCs that are behind plan now, at least one was already behind early (never-started
    // shape) and at least one was on-track early (decelerating shape). Read at the second
    // observed week (index 1), which always exists since the generator keeps weeksElapsed ≥ 5.
    for (const seed of [1, 7, 42]) {
      const behind = generateProductClass(seed).filter(
        (cc) => cc.planCurve[cc.weeksElapsed - 1] - cc.actualCumulativeFraction > FLAG_THRESHOLD,
      );
      const earlyGap = (cc: (typeof behind)[number]) =>
        cc.planCurve[1] - (cc as { actualCurve: number[] }).actualCurve[1];
      expect(behind.some((cc) => earlyGap(cc) > FLAG_THRESHOLD)).toBe(true); // ≥1 never-started shape
      expect(behind.some((cc) => earlyGap(cc) <= FLAG_THRESHOLD)).toBe(true); // ≥1 decelerating shape
    }
  });
});
