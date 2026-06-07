// @scaffolding — `classifyReason`'s name/path (imported here from `@/explanation`) is a
// provisional seam /build may relocate (logging in build-deviations.md). The behaviors are
// the contract: the fixed archetype vocabulary, trajectory reads from the actual curve, the
// urgency-first priority, the no-curve fallback, and that the composed sentence speaks the
// archetype while preserving the frozen gap-points / weeks-remaining facts.
import { describe, it, expect } from 'vitest';
import { classifyReason } from '@/explanation';
import { composeExplanation } from '@/explanation';
import { evaluate } from '@/engine';
import { recommendTier } from '@/tier';

const PLAN = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98, 1.0];
const ARCHETYPES = ['seasonal-cliff', 'inventory-depth', 'decelerating', 'never-started', 'behind-plan'];

// Minimal CC fixture. `actualCurve` is the observed weekly cumulative actual: length === the
// elapsed weeks, last element === actualCumulativeFraction (the scalar the engine reads "now").
function cc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'x',
    name: 'Test CC',
    price: 100,
    liquidationFloor: 40,
    weeksTotal: 12,
    weeksElapsed: 9,
    weeksRemaining: 3,
    inventoryUnits: 0,
    planCurve: PLAN,
    actualCumulativeFraction: 0.3,
    ...overrides,
  };
}

// --- Trajectory-shaped curves (weeksElapsed = 9, so length 9, last = actualCumulativeFraction).
// never-started: behind plan beyond the flag threshold at EVERY early week.
const neverStartedCurve = [0.03, 0.06, 0.09, 0.12, 0.15, 0.18, 0.22, 0.26, 0.3];
// decelerating: exactly tracks plan through the first six weeks, then stalls (behind only late).
const deceleratingCurve = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.62, 0.63, 0.64];

describe('classifyReason — the reason vocabulary', () => {
  it('classifies a CC that was behind plan from early on as never-started', () => {
    const c = cc({ actualCurve: neverStartedCurve, actualCumulativeFraction: 0.3 }); // gap 0.5
    expect(classifyReason(c)).toBe('never-started');
  });

  it('classifies a CC that tracked plan early but fell behind later as decelerating', () => {
    const c = cc({ actualCurve: deceleratingCurve, actualCumulativeFraction: 0.64 }); // gap 0.16
    expect(classifyReason(c)).toBe('decelerating');
  });

  it('classifies a CC with few weeks left as seasonal-cliff', () => {
    // weeksRemaining 1 ⇒ at the cliff; no curve, no inventory pressure.
    const c = cc({ weeksElapsed: 11, weeksRemaining: 1, actualCumulativeFraction: 0.5 });
    expect(classifyReason(c)).toBe('seasonal-cliff');
  });

  it('classifies a CC sitting on heavy stock with time pressure as inventory-depth', () => {
    // Huge units over few remaining weeks ⇒ well past any reasonable depth threshold; not a cliff.
    const c = cc({ weeksElapsed: 6, weeksRemaining: 6, inventoryUnits: 10000, actualCumulativeFraction: 0.2 });
    expect(classifyReason(c)).toBe('inventory-depth');
  });

  it('falls back to the behind-plan baseline when no acute story applies', () => {
    // Behind, but comfortable weeks, no stock pressure, and no curve to read a trajectory from.
    const c = cc({ weeksElapsed: 6, weeksRemaining: 6, inventoryUnits: 0, actualCumulativeFraction: 0.2 });
    expect(classifyReason(c)).toBe('behind-plan');
  });

  it('always returns one of the fixed archetypes', () => {
    for (const c of [
      cc({ actualCurve: neverStartedCurve }),
      cc({ actualCurve: deceleratingCurve, actualCumulativeFraction: 0.64 }),
      cc({ weeksElapsed: 11, weeksRemaining: 1 }),
      cc({ inventoryUnits: 9999, weeksRemaining: 2 }),
      cc({ actualCumulativeFraction: 0.2 }),
    ]) {
      expect(ARCHETYPES).toContain(classifyReason(c));
    }
  });

  it('is deterministic: the same CC always classifies the same way', () => {
    const c = cc({ actualCurve: neverStartedCurve });
    expect(classifyReason(c)).toBe(classifyReason(c));
  });

  // --- Priority (urgency-first): seasonal-cliff > inventory-depth > decelerating > never-started.

  it('prefers seasonal-cliff over a trajectory story when both apply', () => {
    // A decelerating-shaped curve, but only one week remains ⇒ the cliff wins the slot.
    const c = cc({
      weeksElapsed: 11,
      weeksRemaining: 1,
      actualCurve: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.71, 0.72, 0.73, 0.74],
      actualCumulativeFraction: 0.74,
    });
    expect(classifyReason(c)).toBe('seasonal-cliff');
  });

  it('prefers inventory-depth over a trajectory story when both apply (but no cliff)', () => {
    // A never-started-shaped curve, plenty of weeks left, but huge stock ⇒ inventory-depth wins.
    const c = cc({
      weeksElapsed: 6,
      weeksRemaining: 6,
      inventoryUnits: 10000,
      actualCurve: [0.02, 0.05, 0.08, 0.1, 0.12, 0.15],
      actualCumulativeFraction: 0.15,
    });
    expect(classifyReason(c)).toBe('inventory-depth');
  });

  // --- Robustness: a CC with no actualCurve can't yield a trajectory archetype, never throws.

  it('does not throw and yields a non-trajectory archetype when no actual curve is present', () => {
    const cliffNoCurve = cc({ weeksElapsed: 11, weeksRemaining: 1, actualCumulativeFraction: 0.5 });
    expect(() => classifyReason(cliffNoCurve)).not.toThrow();
    expect(classifyReason(cliffNoCurve)).toBe('seasonal-cliff');

    const baselineNoCurve = cc({ weeksElapsed: 6, weeksRemaining: 6, actualCumulativeFraction: 0.2 });
    expect(['behind-plan', 'inventory-depth', 'seasonal-cliff']).toContain(classifyReason(baselineNoCurve));
    expect(classifyReason(baselineNoCurve)).not.toBe('decelerating');
    expect(classifyReason(baselineNoCurve)).not.toBe('never-started');
  });
});

describe('composeExplanation — speaks the archetype, keeps the frozen facts', () => {
  function explain(c: ReturnType<typeof cc>) {
    const e = evaluate(c);
    const rec = recommendTier({ severity: Math.max(e.gap, 0), price: c.price, liquidationFloor: c.liquidationFloor });
    return composeExplanation(c, e, rec);
  }

  it('states the gap in points and the weeks remaining, and is non-empty', () => {
    const c = cc({ actualCurve: neverStartedCurve, actualCumulativeFraction: 0.3 }); // gap 0.5 → 50 pts, 3 wks
    const e = evaluate(c);
    const gapPoints = Math.round(e.gap * 100);
    const s = explain(c);
    expect(s.trim().length).toBeGreaterThan(0);
    expect(s).toMatch(new RegExp(`\\b${gapPoints}\\s*(?:pts|points)\\b`));
    expect(s).toMatch(new RegExp(`\\b${c.weeksRemaining}\\s*(?:wk|wks|week|weeks)\\b`));
  });

  it('phrases different archetypes distinguishably', () => {
    const neverStarted = explain(cc({ actualCurve: neverStartedCurve, actualCumulativeFraction: 0.3 }));
    const cliff = explain(cc({ weeksElapsed: 11, weeksRemaining: 1, actualCumulativeFraction: 0.5 }));
    expect(neverStarted).not.toBe(cliff);
  });

  it('is deterministic', () => {
    const c = cc({ actualCurve: deceleratingCurve, actualCumulativeFraction: 0.64 });
    expect(explain(c)).toBe(explain(c));
  });
});
