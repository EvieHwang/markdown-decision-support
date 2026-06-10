import type { CC, NonCandidate } from '@/types';
import { evaluate, FLAG_THRESHOLD } from '@/engine';
import { classifyHealth } from '@/health';
import { HEALTH_META } from '@/presentation';
import { Icon } from '@/components/ui/Icon';
import { HealthLabel } from '@/components/ui/primitives';
import { EditField } from '@/components/EditField';
import { round1, round2 } from '@/format';
import type { EditableField } from '@/edit';

const FLAG_POINTS = Math.round(FLAG_THRESHOLD * 100);

/**
 * The expandable detail panel for an on/ahead non-candidate — the counterpart to the
 * candidate `DetailPanel`, giving the on/ahead side the same depth of explanation:
 *
 *  - **Why it's not a candidate** — the health label + its rule, and the same plan-vs-actual
 *    key/value readout (plan checkpoint %, actual sell-through %, and the signed gap).
 *  - **What would change the call** — the flag tolerance restated against this CC's position,
 *    so the buyer sees exactly how far it is from becoming a markdown candidate.
 *  - **Adjust inputs** — the same four edit fields a candidate carries; dropping sell-through
 *    enough pushes the CC over the flag threshold and it moves to the behind-plan list live.
 */
export function NonCandidateDetail({
  cc,
  nc,
  onEdit,
}: {
  cc: CC;
  nc: NonCandidate;
  onEdit: (id: string, field: EditableField, value: number) => void;
}) {
  const ev = evaluate(cc);
  const health = classifyHealth(nc);
  const healthMeta = HEALTH_META[health];

  const planCheckpointPct = Math.round((cc.actualCumulativeFraction + ev.gap) * 100);
  const actualPct = Math.round(cc.actualCumulativeFraction * 100);
  const gapLabel =
    nc.gapPoints > 0
      ? `${nc.gapPoints} pts behind`
      : nc.gapPoints < 0
        ? `${-nc.gapPoints} pts ahead`
        : 'on plan';

  return (
    <div className="detail">
      <div className="detail-grid">
        {/* WHY NOT A CANDIDATE */}
        <section className="detail-card">
          <div className="detail-card-h">
            <Icon name="check" size={13} /> Why it’s not a candidate
          </div>
          <p className="detail-reason">
            <HealthLabel health={health} />
            <span className="detail-reason-rule">{healthMeta.rule}</span>
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
            <div className="kv-ok">
              <dt>Gap vs plan</dt>
              <dd className="mono">{gapLabel}</dd>
            </div>
          </dl>
        </section>

        {/* WHAT WOULD CHANGE THE CALL */}
        <section className="detail-card">
          <div className="detail-card-h">
            <Icon name="flag" size={13} /> What would change the call
          </div>
          <p className="detail-note">
            <Icon name="info" size={13} />
            <span>
              A CC becomes a markdown candidate once it slips more than{' '}
              <strong>{FLAG_POINTS} pts</strong> behind the plan checkpoint. This one is{' '}
              <strong>{gapLabel}</strong>
              {nc.gapPoints <= 0
                ? ' — comfortably clear of the threshold.'
                : `, still inside the ${FLAG_POINTS}-point tolerance.`}{' '}
              Lower its sell-through below to see it cross over and join the behind-plan list.
            </span>
          </p>
        </section>
      </div>

      {/* EDIT CONTROLS — the same four fields a candidate carries */}
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
