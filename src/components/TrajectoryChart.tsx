import type { CC } from '@/types';
import { buildTrajectory, type TrajectoryPoint } from '@/trajectory';

/**
 * A small hand-rolled SVG that draws one CC's plan curve (full season) against its
 * observed actual sell-through (observed weeks) on a shared week axis, with the
 * current week marked (Feature 4 — Plan-vs-Actual Drill-Down). No chart library.
 *
 * The actual line terminates at the engine-live current point
 * `(weeksElapsed, actualCumulativeFraction)`, so it can never contradict the gap,
 * tier, or explanation the same row states. Observed history draws solid; when an
 * edit pulls the live point off the recorded path (`divergent`), the final segment
 * to the live point draws distinctly (dashed) — an honest "this is your hypothetical,
 * not the recorded path".
 *
 * Pure function of its CC: same CC ⇒ same output. No randomness, no network. Prints
 * no gap number and no tier — the row owns those; the gap is visible as the distance
 * between the two lines. Carries a text alternative (`role="img"` + accessible name)
 * naming the CC and its live actual position, so it is not a content-free graphic.
 */
export function TrajectoryChart({ cc }: { cc: CC }) {
  const { plan, observedActual, livePoint, divergent } = buildTrajectory(cc);

  // Viewport. A fixed inner box with padding; weeks map to x, fractions to y.
  const W = 280;
  const H = 120;
  const PAD = 12;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  // weeksTotal is ≥ 2 by the generator, but guard the divisor so a degenerate
  // single-week season can never produce a non-finite x.
  const weekSpan = Math.max(cc.weeksTotal - 1, 1);
  const x = (week: number) => PAD + ((week - 1) / weekSpan) * innerW;
  // y is inverted: value 1.0 sits at the top, 0 at the bottom.
  const y = (value: number) => PAD + (1 - value) * innerH;

  const pointsToPath = (pts: TrajectoryPoint[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.week)} ${y(p.value)}`).join(' ');

  const planPath = pointsToPath(plan);
  const observedPath = pointsToPath(observedActual);

  // The hypothetical segment: drawn only when the live point diverges from observed
  // history. Anchored at the last observed point (when there is one) and ending at
  // the live point. With no observed history there is no segment to draw.
  const lastObserved = observedActual[observedActual.length - 1];
  const hypotheticalPath =
    divergent && lastObserved
      ? `M ${x(lastObserved.week)} ${y(lastObserved.value)} L ${x(livePoint.week)} ${y(livePoint.value)}`
      : '';

  const livePct = Math.round(livePoint.value * 100);
  const label = `${cc.name}: actual ${livePct}% at week ${livePoint.week} of ${cc.weeksTotal}`;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${W} ${H}`}
      className="mt-2 h-28 w-full max-w-sm rounded border border-neutral-800 bg-neutral-950"
      preserveAspectRatio="none"
    >
      {/* Current-week marker: a faint vertical rule at the live week. */}
      <line
        x1={x(livePoint.week)}
        y1={PAD}
        x2={x(livePoint.week)}
        y2={H - PAD}
        stroke="currentColor"
        strokeWidth={1}
        className="text-neutral-700"
      />

      {/* Plan series: the full-season reference line. */}
      <path d={planPath} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-neutral-500" />

      {/* Observed actual history: solid. */}
      {observedActual.length > 1 && (
        <path d={observedPath} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-sky-400" />
      )}

      {/* Hypothetical (post-edit) segment: dashed, distinct from solid history. */}
      {hypotheticalPath && (
        <path
          d={hypotheticalPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          className="text-sky-400"
        />
      )}

      {/* The live current point itself, always plotted so a single-week or no-history
          CC still shows where "now" sits. */}
      <circle cx={x(livePoint.week)} cy={y(livePoint.value)} r={2.5} fill="currentColor" className="text-sky-300" />
    </svg>
  );
}
