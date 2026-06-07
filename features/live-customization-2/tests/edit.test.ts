// @scaffolding — `applyEdit`'s name/path is a provisional seam /build may refine
// (logging in build-deviations.md). The behaviors asserted are the contract: purity,
// per-field clamp ranges, cross-field clamp, the weeks-elapsed/weeks-remaining couple,
// non-finite no-op, and that every result still satisfies F1's invariant set.
import { describe, it, expect } from 'vitest';
import { applyEdit } from '@/edit';

const FLOOR_RATIO = 0.85; // F1 contract: liquidationFloor ≤ price × 0.85 (First tier always fits)

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
    planCurve: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98, 1.0],
    actualCumulativeFraction: 0.5,
    ...overrides,
  };
}

// Every editable field must leave the CC satisfying F1's full invariant set.
function expectInvariants(c: ReturnType<typeof cc>) {
  expect(c.actualCumulativeFraction).toBeGreaterThanOrEqual(0);
  expect(c.actualCumulativeFraction).toBeLessThanOrEqual(1);
  expect(c.price).toBeGreaterThan(0);
  expect(c.liquidationFloor).toBeGreaterThan(0);
  expect(c.liquidationFloor).toBeLessThanOrEqual(c.price * FLOOR_RATIO + 1e-9);
  expect(Number.isInteger(c.weeksElapsed)).toBe(true);
  expect(c.weeksElapsed).toBeGreaterThanOrEqual(1);
  expect(c.weeksRemaining).toBeGreaterThanOrEqual(1);
  expect(c.weeksElapsed + c.weeksRemaining).toBe(c.weeksTotal);
}

describe('applyEdit — clamped inline edit of one scalar input', () => {
  it('is pure: the input CC is not mutated and a new object is returned', () => {
    const original = cc();
    const result = applyEdit(original, 'actualCumulativeFraction', 0.1);
    expect(original.actualCumulativeFraction).toBe(0.5); // untouched
    expect(result).not.toBe(original);
    expect(result.actualCumulativeFraction).toBeCloseTo(0.1, 6);
  });

  it('changes only the targeted field (sell-through edit leaves price/floor/weeks alone)', () => {
    const r = applyEdit(cc(), 'actualCumulativeFraction', 0.2);
    expect(r.price).toBe(100);
    expect(r.liquidationFloor).toBe(50);
    expect(r.weeksElapsed).toBe(6);
    expect(r.weeksRemaining).toBe(6);
  });

  it('clamps actual sell-through into [0, 1]', () => {
    expect(applyEdit(cc(), 'actualCumulativeFraction', 2).actualCumulativeFraction).toBe(1);
    expect(applyEdit(cc(), 'actualCumulativeFraction', -1).actualCumulativeFraction).toBe(0);
    expect(applyEdit(cc(), 'actualCumulativeFraction', 0.42).actualCumulativeFraction).toBeCloseTo(
      0.42,
      6,
    );
  });

  it('clamps the liquidation floor to (0, price × 0.85]', () => {
    const high = applyEdit(cc({ price: 100 }), 'liquidationFloor', 200);
    expect(high.liquidationFloor).toBeCloseTo(85, 6); // capped at price × 0.85
    const low = applyEdit(cc({ price: 100 }), 'liquidationFloor', -10);
    expect(low.liquidationFloor).toBeGreaterThan(0);
    expectInvariants(high);
    expectInvariants(low);
  });

  it('clamps price up so the existing floor still fits under price × 0.85 (cross-field clamp)', () => {
    // floor 50 requires price ≥ 50 / 0.85 ≈ 58.82; a lower price entry clamps to that bound.
    const r = applyEdit(cc({ price: 100, liquidationFloor: 50 }), 'price', 10);
    expect(r.price).toBeCloseTo(50 / FLOOR_RATIO, 6);
    expect(r.liquidationFloor).toBe(50); // the partner field is never silently rewritten
    expectInvariants(r);
  });

  it('clamps weeks elapsed to an integer in [1, weeksTotal − 1] and updates weeks remaining', () => {
    const tooHigh = applyEdit(cc({ weeksTotal: 12 }), 'weeksElapsed', 99);
    expect(tooHigh.weeksElapsed).toBe(11);
    expect(tooHigh.weeksRemaining).toBe(1);

    const tooLow = applyEdit(cc({ weeksTotal: 12 }), 'weeksElapsed', 0);
    expect(tooLow.weeksElapsed).toBe(1);
    expect(tooLow.weeksRemaining).toBe(11);

    const fractional = applyEdit(cc({ weeksTotal: 12 }), 'weeksElapsed', 3.7);
    expect(Number.isInteger(fractional.weeksElapsed)).toBe(true);
    expect(fractional.weeksElapsed).toBeGreaterThanOrEqual(1);
    expect(fractional.weeksElapsed).toBeLessThanOrEqual(11);
    expect(fractional.weeksElapsed + fractional.weeksRemaining).toBe(12);
  });

  it('treats a non-finite value as a no-op (no NaN/Infinity ever lands in the CC)', () => {
    expect(applyEdit(cc(), 'price', NaN)).toEqual(cc());
    expect(applyEdit(cc(), 'actualCumulativeFraction', Infinity)).toEqual(cc());
    expect(applyEdit(cc(), 'liquidationFloor', -Infinity)).toEqual(cc());
  });

  it('always returns a CC satisfying the full invariant set, whatever is thrown at it', () => {
    expectInvariants(applyEdit(cc(), 'actualCumulativeFraction', 5));
    expectInvariants(applyEdit(cc(), 'price', 0));
    expectInvariants(applyEdit(cc(), 'liquidationFloor', 1e9));
    expectInvariants(applyEdit(cc(), 'weeksElapsed', -4));
  });
});
