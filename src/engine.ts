import type { CC, Evaluation } from '@/types';

// A CC is flagged as a markdown candidate only once it is meaningfully behind
// plan. A CC on or ahead of plan (gap ≤ 0) is never flagged; this small
// positive threshold keeps trivially-behind CCs (rounding-level noise) out.
export const FLAG_THRESHOLD = 0.05;

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

export function evaluate(cc: CC): Evaluation {
  const gap = plannedNow(cc) - cc.actualCumulativeFraction;
  const severity = Math.max(gap, 0);
  const flagged = gap > FLAG_THRESHOLD;
  return { gap, severity, flagged, weeksRemaining: cc.weeksRemaining };
}
