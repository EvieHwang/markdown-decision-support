import type { CC, Candidate } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { ReasonLabel, TierBadge, Stat } from '@/components/ui/primitives';
import { Sparkline } from '@/components/Sparkline';
import { stripName } from '@/format';

/**
 * The "how to read a row" anatomy block (Feature 7 — R2.3). Renders a dashed sample
 * row built from the top candidate, annotated with numbered pins, and a legend mapping
 * each pin to a label + description — teaching a cold visitor how to read a candidate
 * before they scan the real list. Presentation-only: adds no editable control.
 */
const LEGEND: ReadonlyArray<readonly [string, string]> = [
  ['The candidate', 'The Color Choice (CC) — a customer’s choice of style + color (not size).'],
  ['Why it’s flagged', 'The one most urgent reason it’s behind, from a fixed vocabulary.'],
  ['Suggested tier', 'Markdown depth (15 / 25 / 40 %) — never cuts below the floor.'],
  ['The read', 'Points behind plan, weeks of runway left, inventory on hand, price → markdown.'],
  ['Trajectory', 'Plan (dashed) vs actual (solid); the colored bar marks today’s gap.'],
];

export function Anatomy({ cc, candidate }: { cc: CC; candidate: Candidate }) {
  const body = stripName(candidate.explanation, cc.name).split(' — suggest')[0];
  return (
    <div className="anatomy">
      <div className="anatomy-inner">
        <p className="anatomy-lede">
          <Icon name="book" size={14} /> How to read a row — each candidate states its case so the decision stays with
          you.
        </p>
        <div className="arow">
          <div className="a-rail">
            <span className="a-rank">1</span>
            <span className="a-sev" />
          </div>
          <div>
            <div className="a-title">
              <span className="a-name">{cc.name}</span>
              <span className="pin pin-inline">1</span>
              <ReasonLabel reason={candidate.reason ?? 'behind-plan'} />
              <span className="pin">2</span>
              <TierBadge tier={candidate.tier} discountPct={candidate.discountPct} />
              <span className="pin">3</span>
            </div>
            <p className="a-expl">{body}.</p>
            <div className="a-meta">
              <Stat icon="arrowDown">{candidate.gapPoints} pts behind</Stat>
              <Stat icon="clock">{candidate.weeksRemaining} wks left</Stat>
              <Stat icon="dollar">
                {`$${cc.price.toFixed(0)} → $${candidate.discountedPrice.toFixed(0)}`}
              </Stat>
              <span className="pin">4</span>
            </div>
          </div>
          <div className="a-spark">
            <Sparkline cc={cc} />
            <span className="pin">5</span>
          </div>
        </div>
        <div className="anatomy-legend">
          {LEGEND.map(([title, desc], i) => (
            <div className="leg-item" key={title}>
              <span className="pin">{i + 1}</span>
              <span>
                <span className="lt">{title}</span>
                <span className="ld">{desc}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
