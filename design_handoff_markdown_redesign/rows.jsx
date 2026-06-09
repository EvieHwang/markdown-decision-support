/* ============================================================================
 * rows.jsx — the candidate row (rich, GitHub-issue-row inspired) plus its
 * expandable detail/edit panel, and the quiet non-candidate row.
 * ========================================================================== */

const fmt$ = (n) => `$${n.toFixed(2)}`;
const TIER_NAMES = ['First', 'Second', 'Clearance'];

// ---- the editable input, GitHub form-control ------------------------------
function EditField({ label, sub, value, step, suffix, prefix, onCommit }) {
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => { setDraft(String(value)); }, [value]);
  const commit = (raw) => {
    const v = parseFloat(raw);
    if (Number.isFinite(v)) onCommit(v);
  };
  return (
    <label className="edit-field">
      <span className="edit-field-label">{label}</span>
      <span className="edit-input-wrap">
        {prefix && <span className="affix">{prefix}</span>}
        <input
          className="form-control mono edit-input"
          type="number" step={step} value={draft}
          aria-label={label}
          onChange={(e) => { setDraft(e.target.value); commit(e.target.value); }}
          style={{ paddingLeft: prefix ? 18 : 8, paddingRight: suffix ? 22 : 8 }}
        />
        {suffix && <span className="affix affix-r">{suffix}</span>}
      </span>
      {sub && <span className="edit-field-sub">{sub}</span>}
    </label>
  );
}

// ---- detail / edit panel ---------------------------------------------------
function DetailPanel({ cc, candidate, onEdit }) {
  const M = window.MDS;
  const ev = M.evaluate(cc);
  const reasonMeta = M.REASON_META[candidate.reason];
  const tierMeta = M.TIER_META[candidate.tier];

  const baseIdx = M.baseTierIndex(ev.tierMagnitude);
  const chosenIdx = TIER_NAMES.indexOf(candidate.tier);
  const floorCapped = chosenIdx < baseIdx;
  const intendedTier = TIER_NAMES[baseIdx];

  return (
    <div className="detail">
      <div className="detail-grid">
        {/* WHY FLAGGED */}
        <section className="detail-card">
          <div className="detail-card-h">
            <Icon name="flag" size={13} /> Why it’s flagged
          </div>
          <p className="detail-reason">
            <ReasonLabel reason={candidate.reason} />
            <span className="detail-reason-rule">{reasonMeta.rule}</span>
          </p>
          <dl className="kv">
            <div><dt>Plan checkpoint now</dt><dd className="mono">{Math.round((cc.actualCumulativeFraction + ev.gap) * 100)}%</dd></div>
            <div><dt>Actual sell-through</dt><dd className="mono">{Math.round(cc.actualCumulativeFraction * 100)}%</dd></div>
            <div className="kv-em"><dt>Gap behind plan</dt><dd className="mono">{candidate.gapPoints} pts</dd></div>
          </dl>
        </section>

        {/* WHY THIS TIER */}
        <section className="detail-card">
          <div className="detail-card-h">
            <Icon name="tag" size={13} /> Why this tier
          </div>
          <div className="tier-ladder">
            {M.TIERS.map((t, i) => {
              const disc = cc.price * (1 - t.discountPct / 100);
              const clears = disc >= cc.liquidationFloor;
              const isChosen = t.tier === candidate.tier;
              const isIntended = i === baseIdx;
              return (
                <div key={t.tier} className={`ladder-row${isChosen ? ' chosen' : ''}${!clears ? ' blocked' : ''}`}>
                  <span className="ladder-tier">
                    {isChosen && <Icon name="check" size={13} stroke={2} style={{ color: 'var(--success-fg)' }} />}
                    {t.tier}
                  </span>
                  <span className="ladder-pct mono">{t.discountPct}%</span>
                  <span className="ladder-price mono">{fmt$(disc)}</span>
                  <span className={`ladder-flag ${clears ? 'ok' : 'no'}`}>
                    {clears ? 'clears floor' : 'below floor'}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="detail-note">
            {floorCapped ? (
              <>
                <Icon name="info" size={13} style={{ color: 'var(--attention-fg)' }} />
                <span>Severity pointed to <strong>{intendedTier}</strong>, but the <strong>{fmt$(cc.liquidationFloor)}</strong> liquidation floor caps it at <strong>{candidate.tier}</strong>.</span>
              </>
            ) : (
              <>
                <Icon name="info" size={13} />
                <span>{tierMeta.note}</span>
              </>
            )}
          </p>
        </section>
      </div>

      {/* EDIT CONTROLS */}
      <section className="edit-block">
        <div className="edit-block-h">
          <Icon name="pencil" size={13} /> Adjust inputs — the engine re-ranks live
        </div>
        <div className="edit-fields">
          <EditField label="Sell-through" suffix="%" step={1}
            value={M.round1(cc.actualCumulativeFraction * 100)}
            sub={`actual to date`}
            onCommit={(v) => onEdit(cc.id, 'actualCumulativeFraction', v / 100)} />
          <EditField label="Price" prefix="$" step={1}
            value={M.round2(cc.price)} sub="ticket price"
            onCommit={(v) => onEdit(cc.id, 'price', v)} />
          <EditField label="Floor" prefix="$" step={1}
            value={M.round2(cc.liquidationFloor)} sub="liquidation floor"
            onCommit={(v) => onEdit(cc.id, 'liquidationFloor', v)} />
          <EditField label="Weeks elapsed" step={1}
            value={cc.weeksElapsed} sub={`of ${cc.weeksTotal} total`}
            onCommit={(v) => onEdit(cc.id, 'weeksElapsed', v)} />
        </div>
      </section>
    </div>
  );
}

// ---- the candidate row -----------------------------------------------------
function CandidateRow({ cc, candidate, rank, maxSeverity, expanded, onToggle, onEdit, annotated, rowRef }) {
  const sevPct = Math.max(6, Math.round((candidate.severity / (maxSeverity || 1)) * 100));
  const sevTone = candidate.reason === 'seasonal-cliff' ? 'var(--danger-fg)'
    : candidate.reason === 'inventory-depth' ? 'var(--orange-fg)'
    : candidate.reason === 'decelerating' ? 'var(--attention-fg)'
    : 'var(--accent-fg)';

  return (
    <li className="cand-row" ref={rowRef} data-id={cc.id} data-annot={annotated ? 'on' : undefined}>
      <button className="cand-main focusable" onClick={onToggle} aria-expanded={expanded}>
        {/* rail: rank + severity meter */}
        <div className="rail">
          <span className="rank mono">{rank}</span>
          <span className="sev" title={`Urgency severity ${candidate.severity.toFixed(3)}`}>
            <span className="sev-fill" style={{ height: `${sevPct}%`, background: sevTone }} />
          </span>
        </div>

        {/* body */}
        <div className="cand-body">
          <div className="cand-titleline">
            <span className="cand-name" data-a="name">{cc.name}</span>
            <span data-a="reason"><ReasonLabel reason={candidate.reason} /></span>
            <span data-a="tier"><TierBadge tier={candidate.tier} discountPct={candidate.discountPct} /></span>
          </div>
          <p className="cand-expl" data-a="expl">{stripName(candidate.explanation, cc.name)}</p>
          <div className="cand-meta">
            <Stat icon="arrowDown" tone={sevTone} title="Points behind the plan checkpoint">{candidate.gapPoints} pts behind</Stat>
            <span className="meta-dot" />
            <Stat icon="clock" title="Weeks left in the season">{candidate.weeksRemaining} wks left</Stat>
            <span className="meta-dot" />
            <Stat icon="package" title="Units of inventory on hand">{cc.inventoryUnits.toLocaleString()} units</Stat>
            <span className="meta-dot" />
            <Stat icon="dollar" title="Ticket price → recommended markdown price">
              {fmt$(cc.price)} → <strong style={{ color: 'var(--fg)' }}>{fmt$(candidate.discountedPrice)}</strong>
            </Stat>
          </div>
        </div>

        {/* sparkline */}
        <div className="cand-spark" data-a="spark">
          <Sparkline cc={cc} />
          <span className="spark-legend">
            <span className="lg lg-plan">plan</span>
            <span className="lg lg-act">actual</span>
          </span>
        </div>

        {/* chevron */}
        <span className={`cand-chev${expanded ? ' open' : ''}`}><Icon name="chevron" size={16} /></span>
      </button>

      {expanded && <DetailPanel cc={cc} candidate={candidate} onEdit={onEdit} />}
    </li>
  );
}

// strip the leading "Name: " the engine prepends, since the row already shows it
function stripName(text, name) {
  const prefix = `${name}: `;
  let s = text.startsWith(prefix) ? text.slice(prefix.length) : text;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---- non-candidate (quiet) row --------------------------------------------
function NonCandidateRow({ nc, cc }) {
  const status = nc.gapPoints > 0
    ? `${nc.gapPoints} pts behind · below flag threshold`
    : nc.gapPoints < 0 ? `${-nc.gapPoints} pts ahead of plan` : 'on plan';
  const ahead = nc.gapPoints <= 0;
  return (
    <li className="nc-row">
      <span className="nc-dot" style={{ background: ahead ? 'var(--success-fg)' : 'var(--fg-subtle)' }} />
      <span className="nc-name">{nc.name}</span>
      <span className="nc-spark"><Sparkline cc={cc} width={108} height={28} /></span>
      <span className="nc-status">{status}</span>
    </li>
  );
}

Object.assign(window, { CandidateRow, NonCandidateRow, DetailPanel, stripName });
