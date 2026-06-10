import { useEffect, useMemo, useState } from 'react';
import type { CC } from '@/types';
import { generateProductClass } from '@/data';
import { evaluateClass } from '@/pipeline';
import { applyEdit, type EditableField } from '@/edit';
import { Icon } from '@/components/ui/Icon';
import { PipelineStrip } from '@/components/PipelineStrip';
import { Anatomy } from '@/components/Anatomy';
import { CandidateRow } from '@/components/CandidateRow';
import { NonCandidateRow } from '@/components/NonCandidateRow';
import { useFlip } from '@/hooks/useFlip';

type Theme = 'light' | 'dark';

const THEME_KEY = 'mds-theme';

/**
 * The initial theme read (Feature 7 — R7.1). A stored override wins; otherwise the OS
 * `prefers-color-scheme` preference is honored; absent `matchMedia` (jsdom, and any
 * environment without it) it falls back to dark **without throwing**. This guard wraps
 * the read on mount — not just the toggle — because every suite that mounts the surface
 * without stubbing `matchMedia` depends on a non-throwing initial read.
 */
function readInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* localStorage unavailable — fall through */
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      /* matchMedia threw — fall through to the dark default */
    }
  }
  return 'dark';
}

/**
 * The redesigned active surface (Feature 7). A faithful view of the **unchanged** F1–F5
 * engine: it derives `{candidates, nonCandidates} = evaluateClass(ccs)` and renders the
 * self-documenting frame (top bar, hero, pipeline strip, anatomy, footer), the rich
 * candidate rows with expandable detail panels, the quiet on/ahead section, and a
 * deliberate empty state — adding presentation only, never filtering or re-sorting the
 * engine's partition. Owns: `seed`, the working `ccs` (edits live here), the single-open
 * `openId`, and the persisted light/dark `theme`.
 */
export function MarkdownSurface({ initialSeed }: { initialSeed: number }) {
  const [seed, setSeed] = useState(initialSeed);
  const [ccs, setCcs] = useState<CC[]>(() => generateProductClass(initialSeed));
  const [openId, setOpenId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => readInitialTheme());

  const { candidates, nonCandidates } = useMemo(() => evaluateClass(ccs), [ccs]);
  const byId = useMemo(() => new Map(ccs.map((c) => [c.id, c])), [ccs]);
  const maxSeverity = candidates.length ? candidates[0].severity : 1;
  const orderSig = candidates.map((c) => c.id).join(',');
  const setRowRef = useFlip(orderSig);
  const spotId = candidates.length ? candidates[0].id : null;

  // Apply the theme to the document element and persist the override.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function chooseTheme(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* persistence is best-effort */
    }
  }

  // Load a class from a seed: discard pending edits and close any open detail row.
  function loadSeed(next: number) {
    if (!Number.isFinite(next)) return;
    setSeed(next);
    setCcs(generateProductClass(next));
    setOpenId(null);
  }

  function edit(id: string, field: EditableField, value: number) {
    setCcs((prev) => prev.map((c) => (c.id === id ? applyEdit(c, field, value) : c)));
  }

  return (
    <div className="page">
      <header className="topbar">
        <span className="brand">
          <span className="glyph">
            <Icon name="pulse" size={17} stroke={1.9} />
          </span>
          <span>
            Markdown Decision Support <span className="sub">· women’s shoes</span>
          </span>
        </span>
        <span className="spacer" />
        <span className="repo-chip">
          <Icon name="package" size={13} /> <span className="b">deterministic</span> engine · seed {seed}
        </span>
        <div className="seg" role="group" aria-label="Theme">
          <button type="button" data-on={theme === 'light'} onClick={() => chooseTheme('light')}>
            <Icon name="sun" size={13} /> Light
          </button>
          <button type="button" data-on={theme === 'dark'} onClick={() => chooseTheme('dark')}>
            <Icon name="moon" size={13} /> Dark
          </button>
        </div>
      </header>

      <main className="container">
        <section className="hero rise">
          <h1>Which colorways should I mark down — and why?</h1>
          <p className="lede">
            This tool does the legwork of spotting which items are behind plan and articulates the case for each. It
            compares actual sell-through against a plan curve, surfaces the candidates in your vocabulary, and suggests a
            markdown tier. The reasoning is fully legible — the decision stays with you.
          </p>
          <div className="chips">
            <span className="chip green">
              <Icon name="check" size={13} /> Rule-based, no AI or optimizer
            </span>
            <span className="chip">
              <Icon name="sync" size={13} /> Edit any input · re-ranks live
            </span>
            <span className="chip purple">
              <Icon name="info" size={13} /> Suggests, never decides
            </span>
          </div>
        </section>

        <PipelineStrip />

        <section className="surface gh-box rise">
          <div className="gh-box-header">
            <h2 className="surface-title">
              <span className="dot-open" />
              Behind plan <span className="counter">{candidates.length}</span>
            </h2>
            <span className="sort-note">
              <Icon name="arrowDown" size={12} /> ranked by urgency
            </span>
            <div className="surface-controls">
              <label className="seed-field">
                <Icon name="search" size={13} /> seed
                <input
                  className="form-control mono"
                  type="number"
                  aria-label="Seed"
                  value={seed}
                  onChange={(e) => loadSeed(parseInt(e.target.value, 10))}
                />
              </label>
              <button type="button" className="btn btn-sm" onClick={() => loadSeed(seed + 1)}>
                <Icon name="sync" size={13} /> Regenerate
              </button>
            </div>
          </div>

          {candidates.length > 0 && <Anatomy cc={byId.get(spotId!)!} candidate={candidates[0]} />}

          {candidates.length === 0 ? (
            <div data-testid="candidates-empty" role="status" className="empty">
              <div className="e-glyph">
                <Icon name="check" size={22} stroke={2} />
              </div>
              <h2>Nothing is behind plan</h2>
              <p>Every colorway is tracking to plan — no markdown candidates right now.</p>
            </div>
          ) : (
            <ul className="cand-list">
              {candidates.map((c, i) => {
                const cc = byId.get(c.id);
                if (!cc) return null;
                return (
                  <CandidateRow
                    key={c.id}
                    cc={cc}
                    candidate={c}
                    rank={i + 1}
                    maxSeverity={maxSeverity}
                    expanded={openId === c.id}
                    spotlit={spotId === c.id}
                    onToggle={() => setOpenId(openId === c.id ? null : c.id)}
                    onEdit={edit}
                    rowRef={setRowRef(c.id)}
                  />
                );
              })}
            </ul>
          )}
        </section>

        {nonCandidates.length > 0 && (
          <section className="surface gh-box nc-section">
            <div className="gh-box-header">
              <h2 className="surface-title" style={{ color: 'var(--fg-muted)' }}>
                <span className="nc-dot" style={{ background: 'var(--success-fg)' }} />
                On or ahead of plan <span className="counter">{nonCandidates.length}</span>
              </h2>
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
            sell-through vs. plan, weeks remaining, inventory and the liquidation floor. The same inputs always produce
            the same output. The tool surfaces candidates and the reasoning behind them;{' '}
            <strong>the markdown call is yours.</strong>
          </span>
        </div>
      </main>
    </div>
  );
}
