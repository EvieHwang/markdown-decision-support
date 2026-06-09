/* ============================================================================
 * app.jsx — the markdown decision surface: self-documenting frame, live
 * candidate list with FLIP re-ranking, inline editing, and the Tweaks panel.
 * ========================================================================== */

const M = window.MDS;

/* ---- pipeline strip: what the engine does, end to end -------------------- */
const PIPE = [
  ['Generate', 'A synthetic women’s-shoes class — each color-colorway (CC) with a plan curve, sell-through, price and floor.'],
  ['Compare', 'Measure every CC’s actual sell-through against its plan checkpoint for the current week.'],
  ['Flag', 'Any CC more than 5 points behind plan becomes a markdown candidate.'],
  ['Rank', 'Order candidates by urgency — the gap, amplified by runway left and inventory depth.'],
  ['Recommend', 'Suggest a tier (15 / 25 / 40 %), capped by the liquidation floor, with a plain-language reason.'],
];

function PipelineStrip() {
  return (
    <section className="pipeline">
      <div className="pipeline-h"><Icon name="layers" size={14} /> How the engine works — deterministic, no AI</div>
      <div className="pipe-steps">
        {PIPE.map(([t, d], i) => (
          <div className="pipe-step" key={t}>
            <div className="num">{i + 1}</div>
            <div className="t">{t}</div>
            <div className="d">{d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---- anatomy: how to read a single row ----------------------------------- */
const ANATOMY_LEGEND = [
  ['The candidate', 'The color-colorway (CC) — a single sellable style + color.'],
  ['Why it’s flagged', 'The one most urgent reason it’s behind, from a fixed vocabulary.'],
  ['Suggested tier', 'Markdown depth (15 / 25 / 40 %) — never cuts below the floor.'],
  ['The read', 'Points behind plan, weeks of runway left, inventory on hand, price → markdown.'],
  ['Trajectory', 'Plan (dashed) vs actual (solid); the colored bar marks today’s gap.'],
];

function AnatomyRow({ cc, candidate }) {
  if (!cc || !candidate) return null;
  const disc = candidate.discountedPrice;
  return (
    <div className="arow">
      <div className="a-rail">
        <span className="a-rank">1</span>
        <span className="a-sev" />
      </div>
      <div>
        <div className="a-title">
          <span className="a-name">{cc.name}</span><span className="pin pin-inline">1</span>
          <span><ReasonLabel reason={candidate.reason} /></span><span className="pin">2</span>
          <span><TierBadge tier={candidate.tier} discountPct={candidate.discountPct} /></span><span className="pin">3</span>
        </div>
        <p className="a-expl">{window.stripName(candidate.explanation, cc.name).split(' — suggest')[0]}.</p>
        <div className="a-meta">
          <Stat icon="arrowDown">{candidate.gapPoints} pts behind</Stat>
          <Stat icon="clock">{candidate.weeksRemaining} wks left</Stat>
          <Stat icon="dollar">${cc.price.toFixed(0)} → ${disc.toFixed(0)}</Stat>
          <span className="pin">4</span>
        </div>
      </div>
      <div className="a-spark">
        <Sparkline cc={cc} />
        <span className="pin">5</span>
      </div>
    </div>
  );
}

function Anatomy({ cc, candidate }) {
  return (
    <div className="anatomy">
      <div className="anatomy-inner">
        <p className="anatomy-lede"><Icon name="book" size={14} /> How to read a row — each candidate states its case so the decision stays with you.</p>
        <AnatomyRow cc={cc} candidate={candidate} />
        <div className="anatomy-legend">
          {ANATOMY_LEGEND.map(([t, d], i) => (
            <div className="leg-item" key={t}>
              <span className="pin">{i + 1}</span>
              <span>
                <span className="lt">{t}</span>
                <span className="ld">{d}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- FLIP re-ranking hook ------------------------------------------------- */
function useFlip(orderSig) {
  const refs = React.useRef(new Map());
  const prev = React.useRef(new Map());
  const lastSig = React.useRef(orderSig);
  const set = React.useCallback((id) => (el) => {
    if (el) refs.current.set(id, el); else refs.current.delete(id);
  }, []);

  React.useLayoutEffect(() => {
    const next = new Map();
    refs.current.forEach((el, id) => { next.set(id, el.getBoundingClientRect().top); });
    if (lastSig.current !== orderSig) {
      next.forEach((top, id) => {
        const p = prev.current.get(id);
        const el = refs.current.get(id);
        if (p != null && el && Math.abs(p - top) > 0.5) {
          const dy = p - top;
          el.style.transition = 'none';
          el.style.transform = `translateY(${dy}px)`;
          el.style.zIndex = '1';
          requestAnimationFrame(() => {
            el.style.transition = 'transform 0.44s cubic-bezier(0.22,1,0.36,1)';
            el.style.transform = '';
            const clear = () => { el.style.zIndex = ''; el.style.transition = ''; el.removeEventListener('transitionend', clear); };
            el.addEventListener('transitionend', clear);
          });
        }
      });
    }
    prev.current = next;
    lastSig.current = orderSig;
  });

  return set;
}

/* ---- the app -------------------------------------------------------------- */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "density": "regular",
  "accent": "#4493f8",
  "showAnatomy": true,
  "spotlight": true
}/*EDITMODE-END*/;

const ACCENTS = ['#4493f8', '#8250df', '#3fb950', '#e8643c', '#d29922'];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [seed, setSeed] = React.useState(42);
  const [ccs, setCcs] = React.useState(() => M.generateProductClass(42));
  const [openId, setOpenId] = React.useState(null);

  const { candidates, nonCandidates } = React.useMemo(() => M.evaluateClass(ccs), [ccs]);
  const byId = React.useMemo(() => new Map(ccs.map((c) => [c.id, c])), [ccs]);
  const maxSev = candidates.length ? candidates[0].severity : 1;
  const orderSig = candidates.map((c) => c.id).join(',');
  const setRowRef = useFlip(orderSig);

  // theme + density + accent on <html>
  React.useEffect(() => {
    const r = document.documentElement;
    r.setAttribute('data-theme', t.theme);
    r.setAttribute('data-density', t.density);
    if (t.accent) {
      r.style.setProperty('--accent-fg', t.accent);
      r.style.setProperty('--accent-emphasis', t.accent);
      r.style.setProperty('--accent-subtle', `color-mix(in oklab, ${t.accent} 15%, transparent)`);
    } else {
      r.style.removeProperty('--accent-fg');
      r.style.removeProperty('--accent-emphasis');
      r.style.removeProperty('--accent-subtle');
    }
  }, [t.theme, t.density, t.accent]);

  function loadSeed(next) {
    if (!Number.isFinite(next)) return;
    setSeed(next);
    setCcs(M.generateProductClass(next));
    setOpenId(null);
  }
  function edit(id, field, value) {
    setCcs((prev) => prev.map((c) => (c.id === id ? M.applyEdit(c, field, value) : c)));
  }

  const spotId = t.spotlight && candidates.length ? candidates[0].id : null;

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="glyph"><Icon name="pulse" size={17} stroke={1.9} /></span>
          <span>Markdown Decision Support <span className="sub">· women’s shoes</span></span>
        </div>
        <span className="spacer" />
        <span className="repo-chip"><Icon name="package" size={13} /> <span className="b">deterministic</span> engine · seed {seed}</span>
        <div className="seg" role="group" aria-label="Theme">
          <button data-on={t.theme === 'light'} onClick={() => setTweak('theme', 'light')}><Icon name="sun" size={13} /> Light</button>
          <button data-on={t.theme === 'dark'} onClick={() => setTweak('theme', 'dark')}><Icon name="moon" size={13} /> Dark</button>
        </div>
      </header>

      <main className="container">
        <section className="hero rise">
          <h1>Which colorways should I mark down — and why?</h1>
          <p className="lede">
            This tool does the legwork of spotting which items are behind plan and articulates the case for each.
            It compares actual sell-through against a plan curve, surfaces the candidates in your vocabulary, and
            suggests a markdown tier. The reasoning is fully legible — the decision stays with you.
          </p>
          <div className="chips">
            <span className="chip green"><Icon name="check" size={13} /> Rule-based, no AI or optimizer</span>
            <span className="chip"><Icon name="sync" size={13} /> Edit any input · re-ranks live</span>
            <span className="chip purple"><Icon name="info" size={13} /> Suggests, never decides</span>
          </div>
        </section>

        <PipelineStrip />

        <section className="surface gh-box rise">
          <div className="gh-box-header">
            <span className="surface-title">
              <span className="dot-open" />
              Behind plan <span className="counter">{candidates.length}</span>
            </span>
            <span className="sort-note"><Icon name="arrowDown" size={12} /> ranked by urgency</span>
            <div className="surface-controls">
              <label className="seed-field">
                <Icon name="search" size={13} /> seed
                <input className="form-control mono" type="number" value={seed}
                  aria-label="Seed"
                  onChange={(e) => loadSeed(parseInt(e.target.value, 10))} />
              </label>
              <button className="btn btn-sm" onClick={() => loadSeed(seed + 1)}>
                <Icon name="sync" size={13} /> Regenerate
              </button>
            </div>
          </div>

          {t.showAnatomy && candidates.length > 0 &&
            <Anatomy cc={byId.get(candidates[0].id)} candidate={candidates[0]} />}

          {candidates.length === 0 ? (
            <div className="empty">
              <div className="e-glyph"><Icon name="check" size={22} stroke={2} /></div>
              <h3>Nothing is behind plan</h3>
              <p>Every colorway is tracking to plan — no markdown candidates right now.</p>
            </div>
          ) : (
            <ul className="cand-list">
              {candidates.map((c, i) => {
                const cc = byId.get(c.id);
                if (!cc) return null;
                return (
                  <CandidateRow key={c.id} cc={cc} candidate={c} rank={i + 1}
                    maxSeverity={maxSev}
                    expanded={openId === c.id}
                    annotated={spotId === c.id}
                    onToggle={() => setOpenId(openId === c.id ? null : c.id)}
                    onEdit={edit}
                    rowRef={setRowRef(c.id)} />
                );
              })}
            </ul>
          )}
        </section>

        {nonCandidates.length > 0 && (
          <section className="surface gh-box nc-section">
            <div className="gh-box-header">
              <span className="surface-title" style={{ color: 'var(--fg-muted)' }}>
                <span className="nc-dot" style={{ background: 'var(--success-fg)' }} />
                On or ahead of plan <span className="counter">{nonCandidates.length}</span>
              </span>
              <span className="sort-note">present for context — no markdown call</span>
            </div>
            <ul className="nc-list">
              {nonCandidates.map((nc) => {
                const cc = byId.get(nc.id);
                if (!cc) return null;
                return <NonCandidateRow key={nc.id} nc={nc} cc={cc} />;
              })}
            </ul>
          </section>
        )}

        <div className="foot">
          <Icon name="info" size={15} />
          <span>
            Every flag, tier and sentence here is <strong>computed deterministically</strong> from the same inputs —
            sell-through vs. plan, weeks remaining, inventory and the liquidation floor. The same inputs always
            produce the same output. The tool surfaces candidates and the reasoning behind them; <strong>the markdown call is yours.</strong>
          </span>
        </div>
      </main>

      <TweaksPanel>
        <TweakSection label="Appearance" />
        <TweakRadio label="Theme" value={t.theme} options={['light', 'dark']}
          onChange={(v) => setTweak('theme', v)} />
        <TweakRadio label="Density" value={t.density} options={['compact', 'regular', 'comfortable']}
          onChange={(v) => setTweak('density', v)} />
        <TweakColor label="Accent" value={t.accent} options={ACCENTS}
          onChange={(v) => setTweak('accent', v)} />
        <TweakSection label="Storytelling" />
        <TweakToggle label="“How to read a row” guide" value={t.showAnatomy}
          onChange={(v) => setTweak('showAnatomy', v)} />
        <TweakToggle label="Spotlight top candidate" value={t.spotlight}
          onChange={(v) => setTweak('spotlight', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
