import type { CC, Evaluation } from '@/types';

// A CC is flagged as a markdown candidate only once it is meaningfully behind
// plan. A CC on or ahead of plan (gap ≤ 0) is never flagged; this small
// positive threshold keeps trivially-behind CCs (rounding-level noise) out.
export const FLAG_THRESHOLD = 0.05;

// Compound-severity amplification constants (Feature 3). Severity is the ORDERING
// key only: the gap magnitude, scaled up by cliff proximity and inventory depth.
// These are a design choice — the tests assert the three behavioral properties
// (finite, gap-monotonic with signals fixed, urgency can invert a raw-gap order),
// not the constants themselves.
const CLIFF_GAIN = 2;
const INVENTORY_GAIN = 0.001;

/**
 * "Planned cumulative fraction now" — the plan checkpoint the actual sell-through
 * is measured against at the current week. `weeksElapsed` weeks have completed,
 * so the comparison point is the plan at the start of the current week, i.e. the
 * checkpoint two array positions back from `weeksElapsed` (1-based week →
 * 0-based index, then the prior completed checkpoint). Clamped to a valid index.
 */
function plannedNow(cc: CC): number {
  const idx = Math.min(Math.max(cc.weeksElapsed - 2, 0), cc.planCurve.length - 1);
  return cc.planCurve[idx];
}

/**
 * The "early checkpoint" index into a CC's curves (Feature 3): an early week (one
 * third of the way through the elapsed season) read by the reason classifier to
 * distinguish a CC that *never started* from one that *decelerated*. Shared with
 * the generator so the synthetic curves and the classifier agree on which week is
 * "early". Clamped to a valid index for any elapsed count.
 */
export function earlyCheckpointIndex(weeksElapsed: number): number {
  return Math.max(0, Math.min(Math.floor(weeksElapsed / 3), weeksElapsed - 1));
}

export function evaluate(cc: CC): Evaluation {
  const gap = plannedNow(cc) - cc.actualCumulativeFraction;
  // The gap-driven magnitude the tier recommender consumes (F1's old severity).
  const tierMagnitude = Math.max(gap, 0);
  const weeksRemaining = cc.weeksRemaining;

  // Compound ordering severity: the gap magnitude amplified by urgency. Guard the
  // division so weeksRemaining can never produce a non-finite value, and floor the
  // inventory term so a negative/garbage input can't pull severity below zero.
  const safeWeeks = Math.max(weeksRemaining, 1);
  const cliffFactor = CLIFF_GAIN / safeWeeks;
  const inventoryFactor = INVENTORY_GAIN * (Math.max(cc.inventoryUnits, 0) / safeWeeks);
  const severity = tierMagnitude * (1 + cliffFactor + inventoryFactor);

  const flagged = gap > FLAG_THRESHOLD;
  return { gap, severity, tierMagnitude, flagged, weeksRemaining };
}
