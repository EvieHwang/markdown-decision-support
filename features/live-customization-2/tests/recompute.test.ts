// @frozen (behaviors) — the whole-class recompute is feature 2's externally-observable
// contract. /build must satisfy these *behaviors* as written: a total/disjoint partition
// into ranked candidates + non-candidates, determinism, and — the anchor — that an unedited
// generated class recomputes to exactly F1's `buildCandidates(seed)`.
// The frozen surface is the behavior, NOT the seam's name/location: the `evaluateClass`
// import path is provisional and /build may rename/relocate it (logging in
// build-deviations.md) so long as every assertion below still holds.
import { describe, it, expect } from 'vitest';
import { evaluateClass, buildCandidates } from '@/pipeline';
import { generateProductClass } from '@/data';
import { applyEdit } from '@/edit';

// planNow at weeksElapsed 6 (index 5) = 0.6
function cc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'x',
    name: 'Test CC',
    price: 100,
    liquidationFloor: 40,
    weeksTotal: 12,
    weeksElapsed: 6,
    weeksRemaining: 6,
    inventoryUnits: 100,
    planCurve: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98, 1.0],
    actualCumulativeFraction: 0.5,
    ...overrides,
  };
}

const behind = cc({ id: 'behind', name: 'Behind CC', actualCumulativeFraction: 0.2 }); // gap 0.4 → flagged
const onPlan = cc({ id: 'onplan', name: 'On-plan CC', actualCumulativeFraction: 0.6 }); // gap 0 → not flagged
const ahead = cc({ id: 'ahead', name: 'Ahead CC', actualCumulativeFraction: 0.8 }); // gap -0.2 → not flagged

describe('evaluateClass — whole-class recompute', () => {
  it('partitions every CC into exactly one of candidates / non-candidates (total, disjoint)', () => {
    const v = evaluateClass([behind, onPlan, ahead]);
    expect(v.candidates.length + v.nonCandidates.length).toBe(3);
    const ids = [...v.candidates.map((c) => c.id), ...v.nonCandidates.map((c) => c.id)].sort();
    expect(ids).toEqual(['ahead', 'behind', 'onplan']);
  });

  it('puts only behind-plan CCs in candidates and the rest in non-candidates', () => {
    const v = evaluateClass([behind, onPlan, ahead]);
    expect(v.candidates.map((c) => c.id)).toEqual(['behind']);
    expect(v.nonCandidates.map((c) => c.id).sort()).toEqual(['ahead', 'onplan']);
    for (const n of v.nonCandidates) {
      expect(n.flagged).toBe(false);
      // the partition still carries gapPoints as a contract field — a finite integer,
      // never undefined/NaN (a build that drops it on non-candidates fails here).
      expect(Number.isInteger(n.gapPoints)).toBe(true);
    }
  });

  it('gives each candidate the full F1 Candidate shape (gap points, tier, floor-safe price, reason)', () => {
    const c = evaluateClass([behind]).candidates[0];
    expect(Number.isInteger(c.gapPoints)).toBe(true);
    expect(c.gapPoints).toBeGreaterThan(0);
    expect(['First', 'Second', 'Clearance']).toContain(c.tier);
    expect(c.discountedPrice).toBeGreaterThanOrEqual(c.liquidationFloor);
    expect(c.explanation).toMatch(new RegExp(`\\b${c.gapPoints}\\s*(?:pts|points)\\b`));
    expect(c.explanation).toMatch(new RegExp(`\\b${c.weeksRemaining}\\s*(?:wk|wks|week|weeks)\\b`));
  });

  it('orders candidates by severity, most severe first', () => {
    const less = cc({ id: 'less', actualCumulativeFraction: 0.45 }); // gap 0.15
    const more = cc({ id: 'more', actualCumulativeFraction: 0.1 }); // gap 0.50
    const sevs = evaluateClass([less, more]).candidates.map((c) => c.severity);
    expect(sevs).toEqual([...sevs].sort((a, b) => b - a));
  });

  it('is deterministic: the same class recomputes to a deep-equal result', () => {
    const ccs = [behind, onPlan, ahead];
    expect(evaluateClass(ccs)).toEqual(evaluateClass(ccs));
  });

  it('stays in lockstep with F1: an unedited generated class yields exactly buildCandidates(seed)', () => {
    for (const seed of [1, 7, 42]) {
      expect(evaluateClass(generateProductClass(seed)).candidates).toEqual(buildCandidates(seed));
    }
  });

  it('renders an all-flagged class with an empty non-candidate list', () => {
    const v = evaluateClass([
      cc({ id: 'a', actualCumulativeFraction: 0.1 }),
      cc({ id: 'b', actualCumulativeFraction: 0.2 }),
    ]);
    expect(v.nonCandidates).toHaveLength(0);
    expect(v.candidates).toHaveLength(2);
  });

  it('renders a none-flagged class with an empty candidate list', () => {
    const v = evaluateClass([onPlan, ahead]);
    expect(v.candidates).toHaveLength(0);
    expect(v.nonCandidates).toHaveLength(2);
  });
});

describe('evaluateClass + applyEdit — live recompute drives candidacy', () => {
  it('pulls a healthy CC into candidacy when its sell-through is edited down', () => {
    expect(evaluateClass([onPlan]).candidates).toHaveLength(0);
    const edited = applyEdit(onPlan, 'actualCumulativeFraction', 0.1); // gap 0.5
    expect(evaluateClass([edited]).candidates).toHaveLength(1);
  });

  it('drops a candidate out when it is edited to fully sold', () => {
    expect(evaluateClass([behind]).candidates).toHaveLength(1);
    const edited = applyEdit(behind, 'actualCumulativeFraction', 1); // gap = planNow − 1 ≤ 0
    expect(evaluateClass([edited]).candidates).toHaveLength(0);
  });

  it('re-reads "now" from the plan curve when weeks elapsed is edited', () => {
    const early = cc({ id: 'wk', weeksElapsed: 2, actualCumulativeFraction: 0.2 }); // planNow 0.2 → gap 0
    expect(evaluateClass([early]).candidates).toHaveLength(0);
    const later = applyEdit(early, 'weeksElapsed', 11); // planNow = planCurve[10] = 0.98 → gap 0.78
    expect(later.weeksRemaining).toBe(1);
    expect(evaluateClass([later]).candidates).toHaveLength(1);
  });

  it('editing the floor up caps the recommended tier to First (a real deeper→First transition)', () => {
    const rank: Record<string, number> = { First: 0, Second: 1, Clearance: 2 };
    // Maximal gap (nearly nothing sold, late in the season) + a generous floor → the
    // recommender is free to pick its deepest tier (cf. F1 tier.test severity≈0.99 → Clearance).
    const deep = cc({
      id: 'deep',
      price: 100,
      liquidationFloor: 10,
      weeksElapsed: 11,
      weeksRemaining: 1,
      actualCumulativeFraction: 0, // planNow = planCurve[10] = 0.98 → gap 0.98
    });
    const beforeTier = evaluateClass([deep]).candidates[0].tier;
    expect(rank[beforeTier]).toBeGreaterThan(rank.First); // pre-edit tier is deeper than First

    // Raise the floor to its cap (price × 0.85): only First's discounted price still clears it.
    const floored = applyEdit(deep, 'liquidationFloor', 1e9);
    const afterTier = evaluateClass([floored]).candidates[0].tier;
    expect(afterTier).toBe('First');
  });

  it('never emits a non-finite number anywhere in the recompute, even after pathological edits', () => {
    let c = cc({ id: 'p' });
    for (const [field, value] of [
      ['actualCumulativeFraction', 1e6],
      ['price', -1e9],
      ['liquidationFloor', 1e9],
      ['weeksElapsed', 1e9],
    ] as const) {
      c = applyEdit(c, field, value);
    }
    const v = evaluateClass([c, applyEdit(onPlan, 'actualCumulativeFraction', NaN)]);
    for (const row of [...v.candidates, ...v.nonCandidates]) {
      for (const val of Object.values(row)) {
        if (typeof val === 'number') expect(Number.isFinite(val)).toBe(true);
      }
    }
  });
});
