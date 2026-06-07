// @scaffolding — `evaluate`'s name/shape is the F1 provisional seam. The behaviors here are
// the F3 contract: `severity` is a compound urgency score (gap amplified by cliff proximity and
// inventory depth) used as the ORDERING key, while the markdown TIER stays gap-driven and
// urgency-invariant. Also: edits carry the actual curve through, and the recompute stays finite.
import { describe, it, expect } from 'vitest';
import { evaluate } from '@/engine';
import { evaluateClass } from '@/pipeline';
import { applyEdit } from '@/edit';

const PLAN = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98, 1.0];

function cc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'x',
    name: 'Test CC',
    price: 100,
    liquidationFloor: 40,
    weeksTotal: 12,
    weeksElapsed: 6, // plannedNow = planCurve[4] = 0.5
    weeksRemaining: 6,
    inventoryUnits: 0,
    planCurve: PLAN,
    actualCumulativeFraction: 0.2,
    ...overrides,
  };
}

describe('compound severity — the ordering key', () => {
  it('is finite and non-decreasing in the gap when the other signals are held fixed', () => {
    // weeksRemaining 6 (no cliff) and inventory 0 (no depth) held fixed; only the gap varies.
    const small = evaluate(cc({ actualCumulativeFraction: 0.45 })).severity; // gap 0.05
    const mid = evaluate(cc({ actualCumulativeFraction: 0.3 })).severity; // gap 0.20
    const big = evaluate(cc({ actualCumulativeFraction: 0.1 })).severity; // gap 0.40
    for (const s of [small, mid, big]) expect(Number.isFinite(s)).toBe(true);
    expect(mid).toBeGreaterThanOrEqual(small);
    expect(big).toBeGreaterThanOrEqual(mid);
  });

  it('rises with cliff proximity at an equal gap', () => {
    // Same gap (0.30) two ways: late season with little runway vs mid season with runway.
    const cliff = evaluate(cc({ weeksElapsed: 11, weeksRemaining: 1, actualCumulativeFraction: 0.65 })); // 0.95−0.65
    const roomy = evaluate(cc({ weeksElapsed: 6, weeksRemaining: 6, actualCumulativeFraction: 0.2 })); // 0.50−0.20
    expect(cliff.gap).toBeCloseTo(roomy.gap, 6); // same gap…
    expect(cliff.severity).toBeGreaterThan(roomy.severity); // …but the cliff is more urgent
  });

  it('rises with inventory depth at an equal gap and equal weeks', () => {
    const light = evaluate(cc({ inventoryUnits: 0 }));
    const heavy = evaluate(cc({ inventoryUnits: 10000 }));
    expect(light.gap).toBeCloseTo(heavy.gap, 6);
    expect(heavy.severity).toBeGreaterThan(light.severity);
  });

  it('lets a smaller-gap but urgent CC outrank a larger-gap CC with runway', () => {
    const bigGap = cc({ id: 'big', weeksElapsed: 6, weeksRemaining: 6, inventoryUnits: 0, actualCumulativeFraction: 0.3 }); // gap 0.20
    const urgent = cc({ id: 'urgent', weeksElapsed: 11, weeksRemaining: 1, inventoryUnits: 100000, actualCumulativeFraction: 0.83 }); // gap 0.12, cliff + deep stock
    expect(evaluate(urgent).severity).toBeGreaterThan(evaluate(bigGap).severity);
    const ranked = evaluateClass([bigGap, urgent]).candidates.map((c) => c.id);
    expect(ranked[0]).toBe('urgent');
  });
});

describe('tier stays gap-driven and urgency-invariant', () => {
  it('does not deepen the tier for inventory pressure (identical gap, only stock differs)', () => {
    // Bit-identical gaps (every field equal but inventory), so any tier difference is purely the
    // recommender wrongly reacting to the urgency signal. Gap 0.30 (Clearance band) on a 40 floor.
    const light = cc({ id: 'light', inventoryUnits: 0, actualCumulativeFraction: 0.2 });
    const heavy = cc({ id: 'heavy', inventoryUnits: 100000, actualCumulativeFraction: 0.2 });
    const out = evaluateClass([light, heavy]).candidates;
    const tierOf = (id: string) => out.find((c) => c.id === id)!.tier;
    const sevOf = (id: string) => out.find((c) => c.id === id)!.severity;
    expect(tierOf('heavy')).toBe(tierOf('light')); // deeper stock ⇒ same cut…
    expect(sevOf('heavy')).toBeGreaterThan(sevOf('light')); // …but higher rank
  });

  it('does not deepen the tier for cliff proximity (equal gap mid-band, only runway differs)', () => {
    // Gap ≈ 0.20 sits safely inside the Second band, so a floating-point ULP can't flip the tier;
    // a tier difference would mean the recommender reacted to the near-cliff urgency.
    const roomy = cc({ id: 'roomy', weeksElapsed: 6, weeksRemaining: 6, actualCumulativeFraction: 0.3 }); // 0.50−0.30
    const cliff = cc({ id: 'cliff', weeksElapsed: 11, weeksRemaining: 1, actualCumulativeFraction: 0.75 }); // 0.95−0.75
    const out = evaluateClass([roomy, cliff]).candidates;
    const tierOf = (id: string) => out.find((c) => c.id === id)!.tier;
    expect(tierOf('cliff')).toBe(tierOf('roomy'));
  });
});

describe('edits preserve the trajectory, recompute stays finite', () => {
  const curve = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];

  it('carries the actual curve through an edit unchanged (history is not rewritten)', () => {
    const c = cc({ actualCurve: curve });
    expect(applyEdit(c, 'price', 80).actualCurve).toEqual(curve);
    // editing the current position leaves the observed early path intact
    expect(applyEdit(c, 'actualCumulativeFraction', 0.1).actualCurve).toEqual(curve);
  });

  it('never emits a non-finite severity, even with curves present and pathological edits', () => {
    // Only the four F2-editable fields are exercised; inventory is non-editable (read-only this feature).
    let c = cc({ id: 'p', actualCurve: curve });
    for (const [field, value] of [
      ['actualCumulativeFraction', 1e6],
      ['price', -1e9],
      ['liquidationFloor', 1e9],
      ['weeksElapsed', 1e9],
    ] as const) {
      c = applyEdit(c, field, value);
    }
    const v = evaluateClass([c, cc({ id: 'q', inventoryUnits: 1e12, actualCumulativeFraction: 0.1 })]);
    for (const row of v.candidates) expect(Number.isFinite(row.severity)).toBe(true);
  });
});
