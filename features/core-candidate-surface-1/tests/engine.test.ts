// @scaffolding — evaluate's name/shape is a provisional seam. The behaviors are the
// contract: gap definition, flag correctness (on/ahead of plan never flagged), and
// severity monotonicity in the gap.
import { describe, it, expect } from 'vitest';
import { evaluate } from '@/engine';

// Minimal CC fixture; only the fields the engine reads need to be meaningful.
function cc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'x',
    name: 'Test CC',
    price: 100,
    liquidationFloor: 50,
    weeksTotal: 12,
    weeksElapsed: 6,
    weeksRemaining: 6,
    inventoryUnits: 100,
    // planned cumulative fraction at each week; at week 6 (index 5) = 0.5
    planCurve: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98, 1.0],
    actualCumulativeFraction: 0.5,
    ...overrides,
  };
}

describe('evaluate — decision engine', () => {
  it('computes the gap as planned-now minus actual-now', () => {
    const e = evaluate(cc({ actualCumulativeFraction: 0.3 })); // plan now = 0.5
    expect(e.gap).toBeCloseTo(0.2, 6);
  });

  it('does not flag a CC that is exactly on plan', () => {
    expect(evaluate(cc({ actualCumulativeFraction: 0.5 })).flagged).toBe(false);
  });

  it('does not flag a CC that is ahead of plan', () => {
    expect(evaluate(cc({ actualCumulativeFraction: 0.7 })).flagged).toBe(false);
  });

  it('flags a CC that is clearly behind plan', () => {
    expect(evaluate(cc({ actualCumulativeFraction: 0.2 })).flagged).toBe(true);
  });

  it('severity is non-decreasing as the gap grows', () => {
    const small = evaluate(cc({ actualCumulativeFraction: 0.45 })).severity; // gap 0.05
    const mid = evaluate(cc({ actualCumulativeFraction: 0.3 })).severity; // gap 0.20
    const big = evaluate(cc({ actualCumulativeFraction: 0.1 })).severity; // gap 0.40
    expect(mid).toBeGreaterThanOrEqual(small);
    expect(big).toBeGreaterThanOrEqual(mid);
  });

  it('passes weeks remaining through', () => {
    expect(evaluate(cc({ weeksRemaining: 4 })).weeksRemaining).toBe(4);
  });
});
