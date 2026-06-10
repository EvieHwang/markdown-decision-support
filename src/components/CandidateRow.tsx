import type { Ref } from 'react';
import type { CC, Candidate } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { ReasonLabel, TierBadge, Stat } from '@/components/ui/primitives';
import { Sparkline } from '@/components/Sparkline';
import { DetailPanel } from '@/components/DetailPanel';
import { fmt$, stripName } from '@/format';
import type { EditableField } from '@/edit';

/** Reason → severity-meter fill color. */
function severityTone(reason: Candidate['reason']): string {
  switch (reason) {
    case 'seasonal-cliff':
      return 'var(--danger-fg)';
    case 'inventory-depth':
      return 'var(--orange-fg)';
    case 'decelerating':
      return 'var(--attention-fg)';
    default:
      return 'var(--accent-fg)';
  }
}

/**
 * A rich candidate row (Feature 7). The whole row is a single `<button>` exposing
 * `aria-expanded` (its only button) — the collapsed-by-default disclosure control;
 * the four edit fields live in the detail panel revealed when it expands. The row
 * states its whole case at a glance: rank + a reason-encoded **severity meter** (fill
 * height monotonic in `severity / maxSeverity`, non-zero for every candidate), the
 * reason label, the tier badge (engine `discountPct`), the explanation (leading name
 * stripped), the meta read (pts behind / wks left / units / price → markdown), and an
 * inline sparkline.
 */
export function CandidateRow({
  cc,
  candidate,
  rank,
  maxSeverity,
  expanded,
  spotlit,
  onToggle,
  onEdit,
  rowRef,
}: {
  cc: CC;
  candidate: Candidate;
  rank: number;
  maxSeverity: number;
  expanded: boolean;
  spotlit: boolean;
  onToggle: () => void;
  onEdit: (id: string, field: EditableField, value: number) => void;
  rowRef: Ref<HTMLLIElement>;
}) {
  const sevPct = Math.max(6, Math.round((candidate.severity / (maxSeverity || 1)) * 100));
  const tone = severityTone(candidate.reason);

  return (
    <li className="cand-row" data-testid="candidate-row" data-id={cc.id} data-annot={spotlit ? 'on' : undefined} ref={rowRef}>
      <button type="button" className="cand-main focusable" onClick={onToggle} aria-expanded={expanded}>
        {/* rail: rank + severity meter */}
        <span className="rail">
          <span className="rank mono">{rank}</span>{' '}
          <span
            className="sev"
            data-testid="severity-meter"
            title={`Urgency severity ${candidate.severity.toFixed(3)}`}
          >
            <span className="sev-fill" style={{ height: `${sevPct}%`, background: tone }} />
          </span>
        </span>

        {/* body */}
        <span className="cand-body">
          <span className="cand-titleline">
            <span className="cand-name">{cc.name}</span>
            <ReasonLabel reason={candidate.reason ?? 'behind-plan'} />
            <TierBadge tier={candidate.tier} discountPct={candidate.discountPct} />
          </span>
          <span className="cand-expl">{stripName(candidate.explanation, cc.name)}</span>
          <span className="cand-meta">
            <Stat icon="arrowDown" tone={tone} title="Points behind the plan checkpoint">
              {candidate.gapPoints} pts behind
            </Stat>
            <span className="meta-dot" />
            <Stat icon="clock" title="Weeks left in the season">
              {candidate.weeksRemaining} wks left
            </Stat>
            <span className="meta-dot" />
            <Stat icon="package" title="Units of inventory on hand">
              {cc.inventoryUnits.toLocaleString()} units
            </Stat>
            <span className="meta-dot" />
            <Stat icon="dollar" title="Ticket price → recommended markdown price">
              {fmt$(cc.price)} → <strong style={{ color: 'var(--fg)' }}>{fmt$(candidate.discountedPrice)}</strong>
            </Stat>
          </span>
        </span>

        {/* sparkline */}
        <span className="cand-spark">
          <Sparkline cc={cc} />
          <span className="spark-legend">
            <span className="lg lg-plan">plan</span>
            <span className="lg lg-act">actual</span>
          </span>
        </span>

        {/* chevron */}
        <span className={`cand-chev${expanded ? ' open' : ''}`}>
          <Icon name="chevron" size={16} />
        </span>
      </button>

      {expanded && <DetailPanel cc={cc} candidate={candidate} onEdit={onEdit} />}
    </li>
  );
}
