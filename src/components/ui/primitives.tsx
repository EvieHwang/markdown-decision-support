import type { ReactNode } from 'react';
import type { ReasonArchetype, Tier } from '@/types';
import { REASON_META, TIER_META } from '@/presentation';
import { Icon, type IconName } from '@/components/ui/Icon';

/**
 * Small presentational primitives (Feature 7). All copy comes from the
 * presentation layer (`REASON_META` / `TIER_META`); these draw the GitHub-style
 * pills and the icon-prefixed stat, never recomputing an engine number.
 */

/** A GitHub-style label pill carrying a candidate's reason archetype. */
export function ReasonLabel({ reason }: { reason: ReasonArchetype }) {
  const meta = REASON_META[reason];
  return (
    <span className={`gh-label k-${meta.kind}`} title={meta.rule}>
      <span className="dot" />
      {meta.label}
    </span>
  );
}

/** The tier badge: tier name + the engine's discount percentage. */
export function TierBadge({ tier, discountPct }: { tier: Tier; discountPct: number }) {
  const meta = TIER_META[tier];
  return (
    <span className={`gh-label k-${meta.kind}`} style={{ fontWeight: 600 }} title={meta.note}>
      <Icon name="tag" size={12} stroke={1.4} />
      {tier} · {discountPct}% off
    </span>
  );
}

/** A tiny icon + value stat used in a row's meta read. */
export function Stat({
  icon,
  children,
  title,
  tone,
}: {
  icon?: IconName;
  children: ReactNode;
  title?: string;
  tone?: string;
}) {
  return (
    <span className="mds-stat" title={title} style={{ color: tone ?? 'var(--fg-muted)' }}>
      {icon && <Icon name={icon} size={13} stroke={1.5} />}
      <span className="tnum">{children}</span>
    </span>
  );
}
