import type { CC } from '@/types';
import { buildTrajectory, type TrajectoryPoint } from '@/trajectory';

/**
 * Inline plan-vs-actual sparkline (Feature 7 — replaces `TrajectoryChart`). A small
 * hand-rolled SVG drawing the full-season plan curve against observed actual
 * sell-through, a soft area fill under the actual line, a dashed current-week rule,
 * and a gap bracket at "now". Built from `buildTrajectory(cc)` (the unchanged F4
 * function) — read-only over the engine.
 *
 * Pure in its CC. Carries `role="img"` + a non-empty accessible name stating the CC
 * and its current actual-vs-plan position as percentages, so assistive tech gets a
 * text alternative and the graphic is never content-free. Never emits NaN: the week
 * divisor is guarded so a degenerate single-observed-week CC still renders.
 */
export function Sparkline({ cc, width = 168, height = 46 }: { cc: CC; width?: number; height?: number }) {
  const traj = buildTrajectory(cc);
  const PADX = 4;
  const PADT = 5;
  const PADB = 5;
  const innerW = width - PADX * 2;
  const innerH = height - PADT - PADB;
  const weekSpan = Math.max(cc.weeksTotal - 1, 1);
  const x = (w: number) => PADX + ((w - 1) / weekSpan) * innerW;
  const y = (v: number) => PADT + (1 - v) * innerH;

  const toPath = (pts: TrajectoryPoint[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.week).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');

  const planPath = toPath(traj.plan);
  const obs = traj.observedActual;
  const lastObs = obs[obs.length - 1];
  const livePath = obs.length ? toPath(obs) : '';
  const hypoPath =
    traj.divergent && lastObs
      ? `M ${x(lastObs.week).toFixed(1)} ${y(lastObs.value).toFixed(1)} L ${x(traj.livePoint.week).toFixed(
          1,
        )} ${y(traj.livePoint.value).toFixed(1)}`
      : '';

  // Gap shading at "now": the vertical band between plan-now and actual-now.
  const nowWeek = traj.livePoint.week;
  const planIdx = Math.min(Math.max(nowWeek - 2, 0), cc.planCurve.length - 1);
  const planNow = cc.planCurve[planIdx];
  const actNow = traj.livePoint.value;
  const gapTop = y(Math.max(planNow, actNow));
  const gapBot = y(Math.min(planNow, actNow));
  const behind = planNow - actNow > 0.001;

  const uid = `sl-${cc.id}`;
  const label = `${cc.name}: actual ${Math.round(actNow * 100)}% vs plan ${Math.round(
    planNow * 100,
  )}% at week ${nowWeek}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible' }}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-fg)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--accent-fg)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {obs.length > 1 && lastObs && (
        <path
          d={`${livePath} L ${x(lastObs.week).toFixed(1)} ${y(0).toFixed(1)} L ${x(obs[0].week).toFixed(
            1,
          )} ${y(0).toFixed(1)} Z`}
          fill={`url(#${uid}-fill)`}
          stroke="none"
        />
      )}
      <line
        x1={x(nowWeek)}
        y1={PADT - 1}
        x2={x(nowWeek)}
        y2={height - PADB + 1}
        stroke="var(--border)"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      <line
        x1={x(nowWeek)}
        y1={gapTop}
        x2={x(nowWeek)}
        y2={gapBot}
        stroke={behind ? 'var(--danger-fg)' : 'var(--success-fg)'}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path d={planPath} fill="none" stroke="var(--fg-subtle)" strokeWidth="1.4" strokeDasharray="3 2.5" opacity="0.9" />
      {obs.length > 1 && <path d={livePath} fill="none" stroke="var(--accent-fg)" strokeWidth="1.8" strokeLinejoin="round" />}
      {hypoPath && <path d={hypoPath} fill="none" stroke="var(--accent-fg)" strokeWidth="1.8" strokeDasharray="3 2.5" />}
      <circle cx={x(nowWeek)} cy={y(planNow)} r="2" fill="var(--canvas)" stroke="var(--fg-subtle)" strokeWidth="1.3" />
      <circle cx={x(nowWeek)} cy={y(actNow)} r="2.6" fill="var(--accent-fg)" />
    </svg>
  );
}
