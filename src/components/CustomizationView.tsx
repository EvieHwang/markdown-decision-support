import { useEffect, useMemo, useRef, useState } from 'react';
import type { CC, NonCandidate } from '@/types';
import { generateProductClass } from '@/data';
import { evaluateClass } from '@/pipeline';
import { applyEdit, type EditableField } from '@/edit';
import { TrajectoryChart } from '@/components/TrajectoryChart';

/**
 * The interactive surface (Feature 2 — Live Customization). Renders the full
 * synthetic class — severity-ranked markdown candidates as the focal list, plus the
 * on/ahead-of-plan CCs present but de-emphasized — and lets the buyer inline-edit
 * four scalar inputs per CC with live recompute. A visible/editable seed plus a
 * regenerate control rebuild the class deterministically, discarding pending edits.
 *
 * Every edit clamps at the control (via `applyEdit`) so the engine's invariants
 * always hold; the decision engine, tier recommender, and explanation composer are
 * reused unchanged through `evaluateClass`.
 */
export function CustomizationView({ initialSeed }: { initialSeed: number }) {
  const [seed, setSeed] = useState(initialSeed);
  // The working class. Edits live here; loading a seed replaces it wholesale,
  // which is how regenerate / seed-entry discard pending edits.
  const [ccs, setCcs] = useState<CC[]>(() => generateProductClass(initialSeed));

  const { candidates, nonCandidates } = useMemo(() => evaluateClass(ccs), [ccs]);
  const byId = useMemo(() => new Map(ccs.map((c) => [c.id, c])), [ccs]);

  // Load a class from a seed, discarding any pending edits.
  function loadSeed(next: number) {
    setSeed(next);
    setCcs(generateProductClass(next));
  }

  function handleSeed(raw: string) {
    const next = parseInt(raw, 10);
    if (Number.isFinite(next)) loadSeed(next);
  }

  // Re-entering the *same* seed must still rebuild (US-5: "setting it to S renders
  // generateProductClass(S)") and discard edits. React's synthetic onChange is
  // deduped by its value tracker when the value is unchanged, so a native change
  // listener carries the same-seed commit; React's onChange covers live display.
  const seedRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = seedRef.current;
    if (!el) return;
    const commit = () => handleSeed(el.value);
    el.addEventListener('change', commit);
    return () => el.removeEventListener('change', commit);
    // setSeed/setCcs are stable; the handler reads the live element value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Regenerate advances to a fresh seed (always different from the current one).
  function regenerate() {
    loadSeed(seed + 1);
  }

  function edit(id: string, field: EditableField, value: number) {
    setCcs((prev) => prev.map((c) => (c.id === id ? applyEdit(c, field, value) : c)));
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Markdown candidates</h1>
          <p className="text-sm text-neutral-400">
            Edit any CC and watch the engine re-rank. The decision stays with you.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-neutral-300">
            <span>Seed</span>
            <input
              ref={seedRef}
              type="number"
              aria-label="Seed"
              value={seed}
              onChange={(e) => handleSeed(e.target.value)}
              className="w-20 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={regenerate}
            className="rounded border border-neutral-700 bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700"
          >
            Regenerate sample
          </button>
        </div>
      </header>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Behind plan ({candidates.length})
      </h2>
      <ul className="mb-8 flex flex-col gap-px">
        {candidates.map((c) => {
          const cc = byId.get(c.id);
          if (!cc) return null;
          return (
            <CCRow key={c.id} cc={cc} testId="candidate-row" onEdit={edit}>
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{c.name}</span>
                <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-200">
                  {c.tier} ({c.discountPct}% off)
                </span>
              </div>
              <p className="text-sm text-neutral-400">{c.explanation}</p>
            </CCRow>
          );
        })}
      </ul>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        On / ahead of plan ({nonCandidates.length})
      </h2>
      <ul className="flex flex-col gap-px opacity-60">
        {nonCandidates.map((n) => {
          const cc = byId.get(n.id);
          if (!cc) return null;
          return (
            <CCRow key={n.id} cc={cc} testId="noncandidate-row" onEdit={edit}>
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{n.name}</span>
                <span className="text-xs text-neutral-500">{nonCandidateStatus(n)}</span>
              </div>
            </CCRow>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * One CC row (candidate or non-candidate). Carries the descriptive `children`, the
 * four editable controls, and an on-demand trajectory chart revealed by a single
 * expand toggle. The toggle is a `button` (not a `spinbutton`), so F2's "exactly
 * four editable controls per CC" contract is preserved — opening the chart reveals
 * no new editable input. The open/collapsed state lives per row and is keyed by CC
 * id at the list level, so it survives a live-recompute re-sort within a section.
 */
function CCRow({
  cc,
  testId,
  children,
  onEdit,
}: {
  cc: CC;
  testId: string;
  children: React.ReactNode;
  onEdit: (id: string, field: EditableField, value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li
      data-testid={testId}
      className="flex flex-col gap-2 border-b border-neutral-800 py-3"
    >
      {children}
      <EditControls cc={cc} onEdit={onEdit} />
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="self-start rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300 hover:bg-neutral-700"
      >
        {open ? 'Hide trajectory' : 'Show trajectory'}
      </button>
      {open && <TrajectoryChart cc={cc} />}
    </li>
  );
}

/** "5 pts ahead of plan" / "2 pts behind (below threshold)" / "on plan". */
function nonCandidateStatus(n: NonCandidate): string {
  if (n.gapPoints > 0) return `${n.gapPoints} pts behind (below threshold)`;
  if (n.gapPoints < 0) return `${-n.gapPoints} pts ahead of plan`;
  return 'on plan';
}

/**
 * The four editable scalar controls for one CC, in the buyer's natural units
 * (sell-through as a percent, price/floor in dollars, weeks as an integer). Each
 * is a labeled numeric input; the entered value is parsed and handed to
 * `applyEdit`, which clamps it before it reaches the engine.
 */
function EditControls({
  cc,
  onEdit,
}: {
  cc: CC;
  onEdit: (id: string, field: EditableField, value: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-400">
      <Field
        label="Sell-through (%)"
        value={round1(cc.actualCumulativeFraction * 100)}
        step={1}
        onChange={(v) => onEdit(cc.id, 'actualCumulativeFraction', v / 100)}
      />
      <Field
        label="Price ($)"
        value={round2(cc.price)}
        step={1}
        onChange={(v) => onEdit(cc.id, 'price', v)}
      />
      <Field
        label="Floor ($)"
        value={round2(cc.liquidationFloor)}
        step={1}
        onChange={(v) => onEdit(cc.id, 'liquidationFloor', v)}
      />
      <Field
        label="Weeks elapsed"
        value={cc.weeksElapsed}
        step={1}
        onChange={(v) => onEdit(cc.id, 'weeksElapsed', v)}
      />
    </div>
  );
}

function Field({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span>{label}</span>
      <input
        type="number"
        aria-label={label}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-24 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
      />
    </label>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
