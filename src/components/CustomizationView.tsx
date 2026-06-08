import { useEffect, useMemo, useRef, useState } from 'react';
import type { CC, NonCandidate } from '@/types';
import { generateProductClass } from '@/data';
import { evaluateClass } from '@/pipeline';
import { applyEdit, type EditableField } from '@/edit';
import { TrajectoryChart } from '@/components/TrajectoryChart';

/**
 * Codified design treatment (Feature 5 — Demo Presentation Pass). A small, reused
 * vocabulary of spacing / type / color tokens so the framing, both list sections,
 * rows, controls, and the empty state read as one consistent, information-dense dark
 * surface (constitution aesthetic: always-dark, 14px base, tight line heights). Raw
 * Tailwind, no component library — these are shared class strings, not new deps.
 */
const T = {
  // type ramp
  title: 'text-xl font-semibold tracking-tight text-neutral-100',
  subtle: 'text-sm leading-snug text-neutral-400',
  sectionHeading: 'text-xs font-semibold uppercase tracking-wide',
  // color: a single dark palette, two emphases for the two list sections
  panel: 'rounded-lg border border-neutral-800 bg-neutral-900/40',
  control:
    'rounded border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 ' +
    'focus:outline-none focus:ring-1 focus:ring-neutral-500',
  input:
    'rounded border border-neutral-700 bg-neutral-900 text-neutral-100 ' +
    'focus:outline-none focus:ring-1 focus:ring-neutral-500',
} as const;

/**
 * The interactive surface (Feature 2 — Live Customization; Feature 5 — Demo
 * Presentation Pass). Renders the full synthetic class — severity-ranked markdown
 * candidates as the focal list, plus the on/ahead-of-plan CCs present but
 * de-emphasized — and lets the buyer inline-edit four scalar inputs per CC with live
 * recompute. A visible/editable seed plus a regenerate control rebuild the class
 * deterministically, discarding pending edits.
 *
 * Feature 5 layers presentation only, never touching the deterministic core: a
 * collapsed-by-default thesis-framing disclosure above the lists, deliberate
 * empty-state rendering when a section's count reaches zero (no dangling "(0)"), and
 * the codified styling tokens above. The data flow, the edit path, and F2's four
 * controls per CC are unchanged.
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
    <section className="mx-auto max-w-3xl px-4 py-8 text-sm leading-snug">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={T.title}>Markdown candidates</h1>
          <p className={T.subtle}>
            Edit any CC and watch the engine re-rank. The decision stays with you.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-neutral-300">
            <span>Seed</span>
            <input
              ref={seedRef}
              type="number"
              aria-label="Seed"
              value={seed}
              onChange={(e) => handleSeed(e.target.value)}
              className={`w-20 px-2 py-1 ${T.input}`}
            />
          </label>
          <button
            type="button"
            onClick={regenerate}
            className={`px-3 py-1 ${T.control}`}
          >
            Regenerate sample
          </button>
        </div>
      </header>

      <ThesisFraming />

      {/* Behind-plan candidates: the focal list, or a deliberate empty state when
          nothing is behind plan. The bare "Behind plan (0)" count is never rendered —
          the empty-state status replaces the heading and list together. */}
      {candidates.length === 0 ? (
        <div
          data-testid="candidates-empty"
          role="status"
          className={`mb-8 px-4 py-6 text-center ${T.panel}`}
        >
          <p className="font-medium text-neutral-200">Nothing is behind plan.</p>
          <p className={`mt-1 ${T.subtle}`}>
            Every CC is tracking to plan — no markdown candidates right now.
          </p>
        </div>
      ) : (
        <>
          <h2 className={`mb-2 text-neutral-400 ${T.sectionHeading}`}>
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
                  <p className={T.subtle}>{c.explanation}</p>
                </CCRow>
              );
            })}
          </ul>
        </>
      )}

      {/* On/ahead-of-plan CCs: de-emphasized context. When every CC is flagged this
          section is empty — omit it entirely rather than dangle an "(0)" heading over
          an empty list. */}
      {nonCandidates.length > 0 && (
        <>
          <h2 className={`mb-2 text-neutral-500 ${T.sectionHeading}`}>
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
        </>
      )}
    </section>
  );
}

/**
 * The thesis-framing disclosure (Feature 5 — R1). A native `button` controlling a
 * content region, collapsed by default so it never crowds the buyer's working screen.
 * Activating it reveals a plain-language statement of the project thesis — the
 * recommendations are deterministic / rule-based, not an AI optimizer or black box,
 * and the decision stays with the buyer. Pure presentation: holds no domain state,
 * adds no editable control, and `aria-expanded` carries the open/collapsed state for
 * keyboard and screen-reader users.
 */
function ThesisFraming() {
  const [open, setOpen] = useState(false);
  return (
    <div className={`mb-6 ${T.panel}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="thesis-framing-content"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between px-4 py-2.5 text-left ${T.control} !border-transparent !bg-transparent`}
      >
        <span className="font-medium text-neutral-200">How this works</span>
        <span aria-hidden="true" className="text-neutral-500">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div
          id="thesis-framing-content"
          className={`space-y-2 border-t border-neutral-800 px-4 py-3 ${T.subtle}`}
        >
          <p>
            Every recommendation here is <strong className="text-neutral-200">deterministic
            and rule-based</strong> — computed from each CC&apos;s sell-through against its
            plan curve, the weeks remaining, inventory depth, and the liquidation floor.
            There is <strong className="text-neutral-200">no AI, no LLM, and no optimizer
            black box</strong>: the same inputs always produce the same flags, tiers, and
            explanations.
          </p>
          <p>
            The tool does the legwork of spotting which CCs are behind plan and articulating
            why. The <strong className="text-neutral-200">decision stays with you</strong> —
            it surfaces candidates and reasoning, never a verdict to take on faith.
          </p>
        </div>
      )}
    </div>
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
        className={`self-start px-2 py-0.5 text-xs text-neutral-300 ${T.control}`}
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
        className={`w-24 px-2 py-1 ${T.input}`}
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
