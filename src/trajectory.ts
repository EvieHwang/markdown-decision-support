import type { CC } from '@/types';

/**
 * One plotted point on a trajectory series: a 1-based week and a cumulative
 * sell-through fraction in [0, 1].
 */
export interface TrajectoryPoint {
  week: number;
  value: number;
}

/**
 * The geometry-independent series a per-CC chart draws (Feature 4 — Plan-vs-Actual
 * Drill-Down). Pure data: no SVG, no viewport. The chart maps these to pixels.
 */
export interface Trajectory {
  /** The full-season planned cumulative sell-through: one point per week, equals `planCurve`. */
  plan: TrajectoryPoint[];
  /**
   * The recorded weekly actual sell-through, truncated to the current week
   * (`min(weeksElapsed, actualCurve.length)`), so a downward `weeksElapsed` edit
   * never plots recorded "future" actuals. Empty when `actualCurve` is absent.
   */
  observedActual: TrajectoryPoint[];
  /**
   * The engine-live current position `(weeksElapsed, actualCumulativeFraction)` of
   * the working CC — the authoritative anchor the chart's actual line ends at.
   */
  livePoint: TrajectoryPoint;
  /**
   * True iff the live current point does not coincide with the observed-actual
   * series at the current week — its value differs from the truncated endpoint, or
   * the current week lies beyond the observed history. The chart draws the final
   * segment to the live point distinctly (dashed) when this is true. False on a
   * fresh/unedited CC (the recorded endpoint already equals the live scalar).
   */
  divergent: boolean;
}

/**
 * Turn a working `CC` into the honest series the trajectory chart draws. Pure and
 * deterministic in the CC (deep-equal CC ⇒ deep-equal `Trajectory`); never throws,
 * including when `actualCurve` is absent, the observed series is a single point, or
 * `weeksElapsed` has been edited above or below the recorded history. Read-only over
 * the engine — it consumes the curves already on `CC` and the engine-live current
 * position; no engine, tier, classifier, or `Candidate`-shape change.
 */
export function buildTrajectory(cc: CC): Trajectory {
  // Plan series: the full-season reference, one point per week, never edited.
  const plan: TrajectoryPoint[] = cc.planCurve.map((value, i) => ({
    week: i + 1,
    value,
  }));

  // Observed-actual series: the recorded curve truncated to the current week, so no
  // recorded actual is ever plotted to the right of the current-week marker. Empty
  // when the CC carries no recorded history.
  const recorded = cc.actualCurve ?? [];
  const observedCount = Math.min(cc.weeksElapsed, recorded.length);
  const observedActual: TrajectoryPoint[] = recorded
    .slice(0, observedCount)
    .map((value, i) => ({ week: i + 1, value }));

  // Live current point: the engine-live anchor the actual line terminates at.
  const livePoint: TrajectoryPoint = {
    week: cc.weeksElapsed,
    value: cc.actualCumulativeFraction,
  };

  // Divergent iff the live point doesn't coincide with observed history at "now":
  // either no observed point sits at the current week (week edited up/down off the
  // recorded tail), or the one that does carries a different value (sell-through
  // edited). With no observed history there is nothing to diverge from.
  const observedAtLive = observedActual.find((p) => p.week === livePoint.week);
  const divergent =
    observedActual.length > 0 &&
    (observedAtLive === undefined || observedAtLive.value !== livePoint.value);

  return { plan, observedActual, livePoint, divergent };
}
