import type { CC, Candidate } from '@/types';
import { evaluate } from '@/engine';
import { baseTierIndex } from '@/tier';
import { REASON_META, TIER_META, TIER_ORDER } from '@/presentation';
import { Icon } from '@/components/ui/Icon';
import { ReasonLabel } from '@/components/ui/primitives';
import { EditField } from '@/components/EditField';
import { fmt$, round1, round2 } from '@/format';
import type { EditableField } from '@/edit';

/**
 * The expandable per-row detail panel (Feature 7). Three blocks over the **unchanged**
 * engine output:
 *
 *  - **Why it's flagged** — the reason label + its rule sentence and a small key/value
 *    list (plan checkpoint %, actual sell-through %, and the gap in points = `gapPoints`).
 *  - **Why this tier** — a First/Second/Clearance ladder showing each tier's discount,
 *    discounted price, and whether it clears the liquidation floor; the engine's chosen
 *    tier is marked. The base tier is read from the engine's exported `baseTierIndex`
 *    applied to the CC's gap magnitude — the same function `recommendTier` uses — so the
 *    "intended vs. capped" note fires exactly when the engine actually capped (chosen
 *    index < base index).
 *  - **Adjust inputs** — exactly the four F2 edit fields, each committing through
 *    `applyEdit` (sell-through entered as a percent, divided by 100).
 */
export function DetailPanel({
  cc,
  candidate,
  onEdit,
}: {
  cc: CC;
  candidate: Candidate;
  onEdit: (id: string, field: EditableField, value: number) => void;
}) {
  const ev = evaluate(cc);
  const reasonMeta = REASON_META[candidate.reason ?? 'behind-plan'];

  const baseIdx = baseTierIndex(ev.tierMagnitude);
  const chosenIdx = TIER_ORDER.indexOf(candidate.tier);
  const floorCapped = chosenIdx < baseIdx;
  const intendedTier = TIER_ORDER[baseIdx];
  const intendedPct = TIER_META[intendedTier].discountPct;
  const intendedPrice = cc.price * (1 - intendedPct / 100);
  // Any tier whose discounted price falls below the floor is struck out. Since deeper tiers
  // are cheaper, the struck tiers always form a deep suffix; the chosen tier never struck.
  const anyStruck = TIER_ORDER.some(
    (t) => cc.price * (1 - TIER_META[t].discountPct / 100) < cc.liquidationFloor,
  );

  const planCheckpointPct = Math.round((cc.actualCumulativeFraction + ev.gap) * 100);
  const actualPct = Math.round(cc.actualCumulativeFraction * 100);

  return (
    <div className="detail">
      <div className="detail-grid">
        {/* WHY FLAGGED */}
        <section className="detail-card">
          <div className="detail-card-h">
            <Icon name="flag" size={13} /> Why it’s flagged
          </div>
          <p className="detail-reason">
            <ReasonLabel reason={candidate.reason ?? 'behind-plan'} />
            <span className="detail-reason-rule">{reasonMeta.rule}</span>
          </p>
          <dl className="kv">
            <div>
              <dt>Plan checkpoint now</dt>
              <dd className="mono">{planCheckpointPct}%</dd>
            </div>
            <div>
              <dt>Actual sell-through</dt>
              <dd className="mono">{actualPct}%</dd>
            </div>
            <div className="kv-em">
              <dt>Gap behind plan</dt>
              <dd className="mono">{candidate.gapPoints} pts</dd>
            </div>
          </dl>
        </section>

        {/* WHY THIS TIER */}
        <section className="detail-card">
          <div className="detail-card-h">
            <Icon name="tag" size={13} /> Why this tier
          </div>
          <div className="tier-ladder">
            {TIER_ORDER.map((tier) => {
              const pct = TIER_META[tier].discountPct;
              const disc = cc.price * (1 - pct / 100);
              const struck = disc < cc.liquidationFloor;
              const isChosen = tier === candidate.tier;
              return (
                <div key={tier} className={`ladder-row${isChosen ? ' chosen' : ''}${struck ? ' struck' : ''}`}>
                  <span className="ladder-tier">
                    {isChosen && <Icon name="check" size={13} stroke={2} style={{ color: 'var(--success-fg)' }} />}
                    {tier} · {pct}%
                  </span>
                  <span className="ladder-band">{TIER_META[tier].band}</span>
                  <span className="ladder-price mono">{fmt$(disc)}</span>
                </div>
              );
            })}
          </div>
          <p className="detail-note">
            {floorCapped ? (
              <>
                <Icon name="info" size={13} style={{ color: 'var(--attention-fg)' }} />
                <span>
                  A <strong>{candidate.gapPoints}-pt</strong> gap points to <strong>{intendedTier}</strong>, but at{' '}
                  {intendedPct}% off (<strong>{fmt$(intendedPrice)}</strong>) it would sell below the{' '}
                  <strong>{fmt$(cc.liquidationFloor)}</strong> floor. Held at <strong>{candidate.tier}</strong>, the
                  deepest tier that clears it.
                </span>
              </>
            ) : anyStruck ? (
              <>
                <Icon name="info" size={13} style={{ color: 'var(--attention-fg)' }} />
                <span>
                  A <strong>{candidate.gapPoints}-pt</strong> gap calls for <strong>{candidate.tier}</strong> (
                  {candidate.discountPct}% off). The deeper tiers are struck out — at this price they’d fall below the{' '}
                  <strong>{fmt$(cc.liquidationFloor)}</strong> liquidation floor.
                </span>
              </>
            ) : (
              <>
                <Icon name="info" size={13} />
                <span>
                  A <strong>{candidate.gapPoints}-pt</strong> gap puts this in the <strong>{candidate.tier}</strong>{' '}
                  tier, so a {candidate.discountPct}% cut is the call.
                </span>
              </>
            )}
          </p>
        </section>
      </div>

      {/* EDIT CONTROLS — exactly the four F2 fields */}
      <section className="edit-block">
        <div className="edit-block-h">
          <Icon name="pencil" size={13} /> Adjust inputs — the engine re-ranks live
        </div>
        <div className="edit-fields">
          <EditField
            label="Sell-through"
            suffix="%"
            step={1}
            value={round1(cc.actualCumulativeFraction * 100)}
            sub="actual to date"
            onCommit={(v) => onEdit(cc.id, 'actualCumulativeFraction', v / 100)}
          />
          <EditField
            label="Price"
            prefix="$"
            step={1}
            value={round2(cc.price)}
            sub="ticket price"
            onCommit={(v) => onEdit(cc.id, 'price', v)}
          />
          <EditField
            label="Floor"
            prefix="$"
            step={1}
            value={round2(cc.liquidationFloor)}
            sub="liquidation floor"
            onCommit={(v) => onEdit(cc.id, 'liquidationFloor', v)}
          />
          <EditField
            label="Weeks elapsed"
            step={1}
            value={cc.weeksElapsed}
            sub={`of ${cc.weeksTotal} total`}
            onCommit={(v) => onEdit(cc.id, 'weeksElapsed', v)}
          />
        </div>
      </section>
    </div>
  );
}
