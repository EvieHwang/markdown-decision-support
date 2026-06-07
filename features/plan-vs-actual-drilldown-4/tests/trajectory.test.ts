// @scaffolding — the module path `@/trajectory`, the `buildTrajectory` name, and the
// `Trajectory` field names (`plan` / `observedActual` / `livePoint` / `divergent`, each
// point `{ week, value }`) are a provisional surface /build may refine (logging in
// build-deviations.md). The behaviors are the contract: the plan series spans the full
// season and equals `planCurve`; the observed-actual series equals `actualCurve` (empty
// when absent); the live current point is the engine-live `(weeksElapsed,
// actualCumulativeFraction)` of the *working* CC; `divergent` flips precisely when an
// edit moves the live point off the recorded path; everything is finite, in range, and
// deterministic, and it never throws.
import { describe, it, expect } from 'vitest';
import type { CC } from '@/types';
import { buildTrajectory } from '@/trajectory';
import { generateProductClass } from '@/data';
import { applyEdit } from '@/edit';

const SEEDS = [1, 7, 42, 100];

/** First forced-behind CC of a seed (cc-0): always a real, curve-bearing candidate. */
function behindCC(seed: number): CC {
  return generateProductClass(seed)[0];
}

describe('buildTrajectory — the plan series', () => {
  it('spans the full season and equals planCurve, week-indexed from 1', () => {
    const cc = behindCC(42);
    const t = buildTrajectory(cc);
    expect(t.plan.map((p) => p.value)).toEqual(cc.planCurve);
    expect(t.plan.map((p) => p.week)).toEqual(cc.planCurve.map((_, i) => i + 1));
    expect(t.plan).toHaveLength(cc.weeksTotal);
  });
});

describe('buildTrajectory — the observed-actual series', () => {
  it('equals the recorded actualCurve over the observed weeks', () => {
    const cc = behindCC(42);
    const t = buildTrajectory(cc);
    expect(t.observedActual.map((p) => p.value)).toEqual(cc.actualCurve);
    expect(t.observedActual.map((p) => p.week)).toEqual(
      (cc.actualCurve ?? []).map((_, i) => i + 1),
    );
  });

  it('is empty (and does not throw) when the CC has no actualCurve', () => {
    const noCurve: CC = {
      id: 'h1',
      name: 'Hand Built — Stone',
      price: 100,
      liquidationFloor: 60,
      weeksTotal: 12,
      weeksElapsed: 6,
      weeksRemaining: 6,
      inventoryUnits: 100,
      planCurve: Array.from({ length: 12 }, (_, i) => (i + 1) / 12),
      actualCumulativeFraction: 0.3,
      // actualCurve deliberately omitted
    };
    const t = buildTrajectory(noCurve);
    expect(t.observedActual).toHaveLength(0);
    expect(Number.isFinite(t.livePoint.week)).toBe(true);
    expect(Number.isFinite(t.livePoint.value)).toBe(true);
    expect(t.livePoint).toEqual({ week: 6, value: 0.3 });
  });
});

describe('buildTrajectory — the live current point is the engine-live anchor', () => {
  it('is (weeksElapsed, actualCumulativeFraction) of the working CC', () => {
    const cc = behindCC(7);
    const t = buildTrajectory(cc);
    expect(t.livePoint).toEqual({
      week: cc.weeksElapsed,
      value: cc.actualCumulativeFraction,
    });
  });

  it('follows a sell-through edit (re-anchors to the edited current position)', () => {
    const cc = behindCC(7);
    const cur = cc.actualCumulativeFraction;
    const next = cur > 0.5 ? 0.1 : 0.9; // a clearly different, in-range value
    const edited = applyEdit(cc, 'actualCumulativeFraction', next);
    const t = buildTrajectory(edited);
    expect(t.livePoint).toEqual({ week: edited.weeksElapsed, value: next });
  });
});

describe('buildTrajectory — divergence (honest history vs. hypothetical)', () => {
  it('is NOT divergent on a fresh generated CC (live point coincides with observed end)', () => {
    // The generator pins actualCurve's last entry to actualCumulativeFraction and its
    // length to weeksElapsed, so a freshly generated CC has no hypothetical segment.
    for (const seed of SEEDS) {
      const cc = behindCC(seed);
      expect(buildTrajectory(cc).divergent).toBe(false);
    }
  });

  it('becomes divergent after an edit moves the current sell-through off the recorded path', () => {
    const cc = behindCC(42);
    const cur = cc.actualCumulativeFraction;
    const next = cur > 0.5 ? 0.1 : 0.9;
    const edited = applyEdit(cc, 'actualCumulativeFraction', next);
    expect(buildTrajectory(edited).divergent).toBe(true);
  });

  it('becomes divergent when weeksElapsed is edited past the observed history', () => {
    const cc = behindCC(42); // weeksElapsed ∈ 5..9, weeksTotal 12 → +1 stays valid
    const edited = applyEdit(cc, 'weeksElapsed', cc.weeksElapsed + 1);
    expect(edited.weeksElapsed).toBe(cc.weeksElapsed + 1); // edit took effect
    expect(buildTrajectory(edited).divergent).toBe(true);
  });
});

describe('buildTrajectory — finite, in range, deterministic', () => {
  it('produces only finite, in-range coordinates across seeds and edits', () => {
    for (const seed of SEEDS) {
      for (const cc of generateProductClass(seed)) {
        const variants = [
          cc,
          applyEdit(cc, 'actualCumulativeFraction', 0.0),
          applyEdit(cc, 'actualCumulativeFraction', 1.0),
          applyEdit(cc, 'weeksElapsed', cc.weeksElapsed + 1),
        ];
        for (const v of variants) {
          const t = buildTrajectory(v);
          for (const p of [...t.plan, ...t.observedActual, t.livePoint]) {
            expect(Number.isFinite(p.week)).toBe(true);
            expect(Number.isFinite(p.value)).toBe(true);
            expect(p.week).toBeGreaterThanOrEqual(1);
            expect(p.value).toBeGreaterThanOrEqual(0);
            expect(p.value).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('is deterministic: the same CC yields a deep-equal trajectory', () => {
    const cc = behindCC(42);
    expect(buildTrajectory(cc)).toEqual(buildTrajectory(cc));
  });
});
