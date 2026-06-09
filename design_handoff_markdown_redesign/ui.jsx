/* ============================================================================
 * ui.jsx — shared presentational primitives (stroke-icon set, sparkline,
 * GitHub-style Label + Tier badge, small bits). Exported to window.
 * ========================================================================== */

// ---- Icon set (consistent 16px stroke icons, currentColor) -----------------
const MDS_ICON_PATHS = {
  clock: <><circle cx="8" cy="8" r="6.25" /><path d="M8 4.5V8l2.6 1.5" /></>,
  package: <><path d="M8 1.6 13.6 4.7v6.6L8 14.4 2.4 11.3V4.7z" /><path d="M2.5 4.8 8 7.9l5.5-3.1M8 7.9V14" /></>,
  tag: <><path d="M2.2 2.2h4.2L13.4 9.2a1.3 1.3 0 0 1 0 1.8l-2.4 2.4a1.3 1.3 0 0 1-1.8 0L2.2 6.4z" /><circle cx="5" cy="5" r="1" fill="currentColor" stroke="none" /></>,
  pulse: <path d="M1.5 8h3l1.6-4 2.8 8 1.6-4h3" strokeLinejoin="round" strokeLinecap="round" />,
  pencil: <><path d="M11.3 2.3 13.7 4.7 5.4 13H3v-2.4z" /><path d="M10 3.6 12.4 6" /></>,
  chevron: <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />,
  sync: <><path d="M13.5 8a5.5 5.5 0 0 1-9.4 3.9M2.5 8a5.5 5.5 0 0 1 9.4-3.9" /><path d="M12.4 1.6v2.6H9.8M3.6 14.4v-2.6h2.6" strokeLinecap="round" strokeLinejoin="round" /></>,
  sun: <><circle cx="8" cy="8" r="3.2" /><path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.3 3.3l1.1 1.1M11.6 11.6l1.1 1.1M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1" strokeLinecap="round" /></>,
  moon: <path d="M13.4 9.3A5.6 5.6 0 1 1 6.7 2.6a4.4 4.4 0 0 0 6.7 6.7" strokeLinejoin="round" />,
  search: <><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3.3 3.3" strokeLinecap="round" /></>,
  alert: <><path d="M8 1.7 15 14H1z" strokeLinejoin="round" /><path d="M8 6v3.5" strokeLinecap="round" /><circle cx="8" cy="11.6" r="0.5" fill="currentColor" stroke="none" /></>,
  info: <><circle cx="8" cy="8" r="6.3" /><path d="M8 7.2v3.6" strokeLinecap="round" /><circle cx="8" cy="5.1" r="0.55" fill="currentColor" stroke="none" /></>,
  check: <path d="m3 8.4 3.2 3.2L13 4.8" strokeLinecap="round" strokeLinejoin="round" />,
  dollar: <><path d="M8 1.5v13" strokeLinecap="round" /><path d="M11 4.3C10.2 3.4 9.2 3 8 3 6.3 3 5 3.9 5 5.3c0 3.2 6 1.4 6 4.6C11 11.4 9.6 12.4 8 12.4c-1.4 0-2.6-.5-3.4-1.5" strokeLinecap="round" strokeLinejoin="round" /></>,
  arrowDown: <path d="M8 3v10m0 0 3.5-3.5M8 13l-3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />,
  flag: <><path d="M3.5 1.5v13" strokeLinecap="round" /><path d="M3.5 2.4h7l-1.4 2.6 1.4 2.6h-7" strokeLinejoin="round" /></>,
  sliders: <><path d="M2.5 5h7M11.5 5h2M2.5 11h2M6.5 11h7" strokeLinecap="round" /><circle cx="10.2" cy="5" r="1.4" /><circle cx="5" cy="11" r="1.4" /></>,
  x: <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />,
  layers: <><path d="M8 1.8 14.2 5 8 8.2 1.8 5z" strokeLinejoin="round" /><path d="m1.8 8 6.2 3.2L14.2 8M1.8 11l6.2 3.2L14.2 11" strokeLinejoin="round" /></>,
  book: <><path d="M2.5 2.6h4.2c.8 0 1.3.5 1.3 1.3v9.5c0-.6-.5-1-1.1-1H2.5z" strokeLinejoin="round" /><path d="M13.5 2.6H9.3c-.8 0-1.3.5-1.3 1.3v9.5c0-.6.5-1 1.1-1h4.4z" strokeLinejoin="round" /></>,
};

function Icon({ name, size = 16, stroke = 1.5, className = '', style }) {
  const p = MDS_ICON_PATHS[name];
  if (!p) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth={stroke} className={className}
      style={{ flex: 'none', ...style }} aria-hidden="true">
      {p}
    </svg>
  );
}

// ---- GitHub-style Label ----------------------------------------------------
function ReasonLabel({ reason, withDot = true }) {
  const meta = window.MDS.REASON_META[reason];
  if (!meta) return null;
  return (
    <span className={`gh-label k-${meta.kind}`} title={meta.rule}>
      {withDot && <span className="dot" />}
      {meta.label}
    </span>
  );
}

// ---- Tier badge ------------------------------------------------------------
function TierBadge({ tier, discountPct }) {
  const meta = window.MDS.TIER_META[tier];
  const kind = meta ? meta.kind : 'muted';
  return (
    <span className={`gh-label k-${kind}`} style={{ fontWeight: 600 }} title={meta && meta.note}>
      <Icon name="tag" size={12} stroke={1.4} />
      {tier} · {discountPct}% off
    </span>
  );
}

// ---- Sparkline: plan vs actual, gap shaded, current week marked ------------
function Sparkline({ cc, width = 168, height = 46, showAxis = false }) {
  const traj = window.MDS.buildTrajectory(cc);
  const PADX = 4, PADT = 5, PADB = 5;
  const innerW = width - PADX * 2;
  const innerH = height - PADT - PADB;
  const weekSpan = Math.max(cc.weeksTotal - 1, 1);
  const x = (w) => PADX + ((w - 1) / weekSpan) * innerW;
  const y = (v) => PADT + (1 - v) * innerH;

  const toPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.week).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const planPath = toPath(traj.plan);

  // observed up to live, ending at live point
  const obs = traj.observedActual.slice();
  const lastObs = obs[obs.length - 1];
  const livePath = obs.length ? toPath(obs) : '';
  const hypoPath = (traj.divergent && lastObs)
    ? `M ${x(lastObs.week).toFixed(1)} ${y(lastObs.value).toFixed(1)} L ${x(traj.livePoint.week).toFixed(1)} ${y(traj.livePoint.value).toFixed(1)}`
    : '';

  // gap shading at "now": vertical band between plan-now and actual-now
  const nowWeek = traj.livePoint.week;
  const planIdx = Math.min(Math.max(nowWeek - 2, 0), cc.planCurve.length - 1);
  const planNow = cc.planCurve[planIdx];
  const actNow = traj.livePoint.value;
  const gapTop = y(Math.max(planNow, actNow));
  const gapBot = y(Math.min(planNow, actNow));
  const behind = planNow - actNow > 0.001;

  const uid = `sl-${cc.id}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible' }}
      role="img"
      aria-label={`${cc.name}: actual ${Math.round(actNow * 100)}% vs plan ${Math.round(planNow * 100)}% at week ${nowWeek}`}>
      <defs>
        <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-fg)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--accent-fg)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* area under actual */}
      {obs.length > 1 && (
        <path d={`${livePath} L ${x(lastObs.week).toFixed(1)} ${y(0).toFixed(1)} L ${x(obs[0].week).toFixed(1)} ${y(0).toFixed(1)} Z`}
          fill={`url(#${uid}-fill)`} stroke="none" />
      )}
      {/* current-week rule */}
      <line x1={x(nowWeek)} y1={PADT - 1} x2={x(nowWeek)} y2={height - PADB + 1}
        stroke="var(--border)" strokeWidth="1" strokeDasharray="2 2" />
      {/* gap bracket at now */}
      <line x1={x(nowWeek)} y1={gapTop} x2={x(nowWeek)} y2={gapBot}
        stroke={behind ? 'var(--danger-fg)' : 'var(--success-fg)'} strokeWidth="2.5" strokeLinecap="round"
        opacity="0.85" />
      {/* plan */}
      <path d={planPath} fill="none" stroke="var(--fg-subtle)" strokeWidth="1.4" strokeDasharray="3 2.5" opacity="0.9" />
      {/* observed actual */}
      {obs.length > 1 && <path d={livePath} fill="none" stroke="var(--accent-fg)" strokeWidth="1.8" strokeLinejoin="round" />}
      {/* hypothetical */}
      {hypoPath && <path d={hypoPath} fill="none" stroke="var(--accent-fg)" strokeWidth="1.8" strokeDasharray="3 2.5" />}
      {/* plan-now + actual-now dots */}
      <circle cx={x(nowWeek)} cy={y(planNow)} r="2" fill="var(--canvas)" stroke="var(--fg-subtle)" strokeWidth="1.3" />
      <circle cx={x(nowWeek)} cy={y(actNow)} r="2.6" fill="var(--accent-fg)" />
    </svg>
  );
}

// ---- Tiny stat with icon ---------------------------------------------------
function Stat({ icon, children, title, tone }) {
  return (
    <span className="mds-stat" title={title} style={{ color: tone || 'var(--fg-muted)' }}>
      {icon && <Icon name={icon} size={13} stroke={1.5} />}
      <span className="tnum">{children}</span>
    </span>
  );
}

Object.assign(window, { Icon, ReasonLabel, TierBadge, Sparkline, Stat });
