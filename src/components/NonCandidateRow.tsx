import type { Ref } from 'react';
import type { CC, NonCandidate } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { HealthLabel, Stat } from '@/components/ui/primitives';
import { Sparkline } from '@/components/Sparkline';
import { NonCandidateDetail } from '@/components/NonCandidateDetail';
import { classifyHealth, composeHealthNote } from '@/health';
import { fmt$, stripName } from '@/format';
import type { EditableField } from '@/edit';

/**
 * A rich on/ahead-of-plan row — the non-candidate counterpart to `CandidateRow`, given
 * the same treatment so the on/ahead section reads with equal weight: a health label, a
 * plain-language sentence, the same meta read (gap / weeks / units / price), an inline
 * plan-vs-actual sparkline, and an expandable detail panel (with the same four edit
 * fields). It carries no markdown call — no tier, no severity rank — because it isn't a
 * markdown decision; everything else mirrors a candidate row.
 */
export function NonCandidateRow({
  nc,
  cc,
  expanded,
  onToggle,
  onEdit,
  rowRef,
}: {
  nc: NonCandidate;
  cc: CC;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (id: string, field: EditableField, value: number) => void;
  rowRef?: Ref<HTMLLIElement>;
}) {
  const health = classifyHealth(nc);
  const note = stripName(composeHealthNote(nc), nc.name);
  const ahead = nc.gapPoints <= 0;
  const gapText =
    nc.gapPoints > 0
      ? `${nc.gapPoints} pts behind`
      : nc.gapPoints < 0
        ? `${-nc.gapPoints} pts ahead`
        : 'on plan';
  const tone = ahead ? 'var(--success-fg)' : 'var(--fg-muted)';

  return (
    <li className="cand-row nc-rich" data-testid="noncandidate-row" data-id={cc.id} ref={rowRef}>
      <button type="button" className="cand-main focusable" onClick={onToggle} aria-expanded={expanded}>
        {/* rail: a status dot in place of the rank + severity meter */}
        <span className="rail">
          <span className="nc-rail-dot" style={{ background: ahead ? 'var(--success-fg)' : 'var(--fg-subtle)' }} />
        </span>

        {/* body */}
        <span className="cand-body">
          <span className="cand-titleline">
            <span className="cand-name">{cc.name}</span>
            <HealthLabel health={health} />
            <span className="gh-label k-muted" title="On or ahead of plan — present for context">
              no markdown call
            </span>
          </span>
          <span className="cand-expl">{note}</span>
          <span className="cand-meta">
            <Stat icon={ahead ? 'check' : 'arrowDown'} tone={tone} title="Distance from the plan checkpoint">
              {gapText}
            </Stat>
            <span className="meta-dot" />
            <Stat icon="clock" title="Weeks left in the season">
              {nc.weeksRemaining} wks left
            </Stat>
            <span className="meta-dot" />
            <Stat icon="package" title="Units of inventory on hand">
              {cc.inventoryUnits.toLocaleString()} units
            </Stat>
            <span className="meta-dot" />
            <Stat icon="dollar" title="Ticket price">
              {fmt$(cc.price)}
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

      {expanded && <NonCandidateDetail cc={cc} nc={nc} onEdit={onEdit} />}
    </li>
  );
}
