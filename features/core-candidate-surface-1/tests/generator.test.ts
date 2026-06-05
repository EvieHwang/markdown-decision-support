// @scaffolding — generateProductClass's name/shape is a provisional seam /build may
// refine (logging in build-deviations.md). The behaviors asserted are the contract:
// determinism and the structural invariants the rest of the pipeline relies on.
import { describe, it, expect } from 'vitest';
import { generateProductClass } from '@/data';

describe('generateProductClass — synthetic women\'s-shoes class', () => {
  it('is deterministic in the seed', () => {
    expect(generateProductClass(7)).toEqual(generateProductClass(7));
  });

  it('produces different data for different seeds', () => {
    expect(generateProductClass(1)).not.toEqual(generateProductClass(2));
  });

  it('produces a class of at least 8 CCs', () => {
    expect(generateProductClass(7).length).toBeGreaterThanOrEqual(8);
  });

  it('keeps the liquidation floor positive and at or below 85% of price (First always fits)', () => {
    for (const cc of generateProductClass(7)) {
      expect(cc.liquidationFloor).toBeGreaterThan(0);
      expect(cc.liquidationFloor).toBeLessThanOrEqual(cc.price * 0.85);
    }
  });

  it('produces a non-decreasing plan curve that ends at approximately 1.0', () => {
    for (const cc of generateProductClass(7)) {
      for (let i = 1; i < cc.planCurve.length; i++) {
        expect(cc.planCurve[i]).toBeGreaterThanOrEqual(cc.planCurve[i - 1]);
      }
      expect(cc.planCurve[cc.planCurve.length - 1]).toBeCloseTo(1.0, 2);
    }
  });

  it('keeps weeks coherent and mid-season', () => {
    for (const cc of generateProductClass(7)) {
      expect(cc.weeksElapsed).toBeGreaterThanOrEqual(1);
      expect(cc.weeksRemaining).toBeGreaterThanOrEqual(1);
      expect(cc.weeksElapsed + cc.weeksRemaining).toBe(cc.weeksTotal);
    }
  });

  it('generates at least one CC that is behind plan', () => {
    const ccs = generateProductClass(7);
    const anyBehind = ccs.some(
      (cc) => cc.planCurve[cc.weeksElapsed - 1] - cc.actualCumulativeFraction > 0.05,
    );
    expect(anyBehind).toBe(true);
  });
});
