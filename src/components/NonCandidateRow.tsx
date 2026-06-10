import type { CC, NonCandidate } from '@/types';
import { Sparkline } from '@/components/Sparkline';

/**
 * The quiet on/ahead-of-plan row (Feature 7). Read-only context — no markdown call,
 * no edit controls — but it still carries a plan-vs-actual sparkline (a smaller, quieter
 * variant) with the same `role="img"` + accessible-name contract as a candidate row.
 */
export function NonCandidateRow({ nc, cc }: { nc: NonCandidate; cc: CC }) {
  const status =
    nc.gapPoints > 0
      ? `${nc.gapPoints} pts behind · below flag threshold`
      : nc.gapPoints < 0
        ? `${-nc.gapPoints} pts ahead of plan`
        : 'on plan';
  const ahead = nc.gapPoints <= 0;

  return (
    <li className="nc-row" data-testid="noncandidate-row">
      <span className="nc-dot" style={{ background: ahead ? 'var(--success-fg)' : 'var(--fg-subtle)' }} />
      <span className="nc-name">{nc.name}</span>
      <span className="nc-spark">
        <Sparkline cc={cc} width={108} height={28} />
      </span>
      <span className="nc-status">{status}</span>
    </li>
  );
}
