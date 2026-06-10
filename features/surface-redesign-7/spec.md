# Spec — Surface Redesign (Feature 7)

A presentation-layer overhaul of the single candidate surface in a GitHub / Primer
aesthetic. It replaces the active surface (`CustomizationView` → `MarkdownSurface`) and the
trajectory chart (`TrajectoryChart` → `Sparkline`), adds a self-documenting frame, an
expandable per-row detail panel with a tier ladder, a light/dark theme, and live re-ranking
— all over the **unchanged** F1–F5 deterministic engine. The only engine touch is exporting
the existing, pure `baseTierIndex` from `tier.ts`. All domain logic (`data`, `engine`,
`tier.recommendTier`, `explanation`, `trajectory`, `edit`, `pipeline`, the `Candidate`
shape) is read-only here.

Behavioral truth for ranking, partition, tiers, reasons, explanations, trajectory points,
and edit-clamping is whatever the existing `src/*.ts` modules produce; this spec never
restates those numbers, only that the surface renders them faithfully.

## Behavioral requirements

### R1 — The new surface is the engine's faithful view
*As a buyer, I need the redesigned surface to show exactly the engine's candidate set, in
the engine's order, so the polish never changes the decision.*

- **R1.1** `MarkdownSurface` (rendered by `App`) shows one candidate row per flagged CC and
  one non-candidate row per on/ahead-of-plan CC, partitioning the full generated class with
  no CC dropped or duplicated — matching `evaluateClass(ccs)` for the active seed.
- **R1.2** Candidate rows render in the engine's order (`candidates` from `evaluateClass`,
  severity-descending) — the same sequence `buildCandidates(seed)` yields.
- **R1.3** Each candidate row shows, sourced from the `Candidate` the engine produced: the
  CC name, its reason label, its tier badge (tier name **and** the engine's `discountPct`),
  the explanation sentence, and the meta read (points behind, weeks left, inventory units,
  `price → discountedPrice`). The displayed discount percentage and prices are the engine's
  values, never recomputed in presentation copy.
- **R1.4** No `NaN`, `undefined`, or `[object Object]` appears anywhere on the surface for
  any reachable seed or edit.

### R2 — Self-documenting frame
*As a hiring manager landing cold, I need the surface to explain — without my interacting —
that the tool is deterministic (not AI) and how to read a candidate.*

- **R2.1** A **pipeline strip** presents the engine as five ordered steps — Generate,
  Compare, Flag, Rank, Recommend — each with a short description. (Step **titles** are the
  contract; descriptive copy is tolerant of wording.)
- **R2.2** The frame communicates the thesis that recommendations are **deterministic /
  rule-based, not AI or an optimizer**, and that the **decision stays with the buyer** —
  visible without interaction (asserted on concept, tolerant of exact wording). This is
  carried by the always-on frame (hero chips / pipeline strip / footer), not a disclosure.
- **R2.3** When at least one candidate exists, a **"how to read a row" anatomy** block
  renders a sample annotated row plus a legend mapping each annotated part to a label and
  description. (Presence + that it teaches the row's parts; exact copy tolerant.)
- **R2.4** A sticky **top bar** shows the brand, a deterministic-engine + current-seed
  indicator, and the theme toggle. The frame is presentation-only: it adds no editable
  domain control and does not alter the candidate/non-candidate partition.

### R3 — Rich candidate row
*As a buyer scanning the list, I need each row to state its whole case at a glance.*

- **R3.1** Each candidate row exposes a **rank** (its 1-based position) and a **severity
  meter** whose fill encodes urgency: taller for higher `severity` relative to the most
  urgent candidate, and colored by reason (cliff = danger, inventory = orange, decelerating
  = attention, else accent). (The behavioral contract: the meter's fill height is a
  monotonic function of `severity/maxSeverity` and is non-zero for every candidate; exact
  pixels and colors are design-reviewed, not asserted.)
- **R3.2** Each row shows an inline **sparkline** (see R6) and a **chevron** affordance
  whose state reflects whether the row's detail is expanded.
- **R3.3** The row's explanation strips the leading `"<name>: "` the engine prepends (the
  name is already shown), but the displayed text is otherwise the engine's sentence — no
  re-authored reason copy.

### R4 — Expandable detail panel (single-open accordion)
*As a buyer, I need to open a candidate to see why it's flagged, why that tier, and to
adjust its inputs — one at a time, without the page jumping around.*

- **R4.1** The row's primary control is a `button` exposing `aria-expanded`; the detail
  panel is **collapsed by default** (`aria-expanded="false"`, detail content absent).
- **R4.2** Activating the control reveals the detail panel and flips `aria-expanded` to
  `"true"`; activating again collapses it. It is keyboard-operable (native `button`).
- **R4.3** The accordion is **single-open**: opening one row's detail collapses any other
  open row (at most one detail panel present at a time).
- **R4.4 "Why it's flagged"** shows the reason label with its rule sentence and a small
  key/value list including the plan checkpoint %, the actual sell-through %, and the gap in
  points — where the gap equals the row's `gapPoints`.
- **R4.5 "Why this tier" — the tier ladder.** A three-row ladder (First, Second, Clearance)
  where each row shows the tier name, its discount %, the price discounted to that tier, and
  whether that price **clears or is below** the liquidation floor. The **chosen** tier (the
  engine's recommended tier for the CC) is marked. When the severity-indicated base tier is
  deeper than the chosen tier (a floor cap), a note states that the floor capped it at the
  chosen tier; otherwise the chosen tier's note shows. The base-tier index is computed from
  the engine's exported `baseTierIndex` applied to the CC's gap magnitude — the same
  function `recommendTier` uses — so the ladder's "intended vs. capped" reasoning can never
  diverge from the engine's actual choice.
- **R4.6** The detail panel holds the **edit block**: exactly four labeled numeric inputs
  (sell-through %, price $, floor $, weeks elapsed), each keyboard-reachable by an
  accessible name in the buyer's vocabulary. No fifth editable domain control exists
  anywhere on a row.

### R5 — Live edit → recompute → re-rank
*As a buyer, I need editing an input to immediately re-run the engine and re-order the list,
proving it's a real engine.*

- **R5.1** Editing any of the four fields commits through `applyEdit(cc, field, value)` (the
  unchanged F2 path; sell-through entered as a percent is divided by 100), updates the
  working set, and re-derives `{candidates, nonCandidates}` from `evaluateClass`.
- **R5.2** A live edit re-partitions and re-ranks: editing a candidate to fully sold removes
  it from the candidate list (its count drops by one); a CC can cross between the
  behind-plan and on/ahead sections, and the section counts update accordingly.
- **R5.3** Editing never produces `NaN`: a cleared/empty field is a no-op at the engine
  (`applyEdit` rejects non-finite input), and the surface continues to render.
- **R5.4** Re-ranking reorders the candidate list to match the new engine order. (DOM
  reordering is the contract; the FLIP *animation* — transform timing, reduced-motion — is
  design-reviewed, not asserted, since jsdom computes no layout.)

### R6 — Sparkline (replaces TrajectoryChart)
*As a buyer, I need to see each CC's plan-vs-actual trajectory inline, with a text
alternative for assistive tech.*

- **R6.1** Each candidate row renders a plan-vs-actual sparkline built from
  `buildTrajectory(cc)` (the unchanged F4 function), exposed with `role="img"` and a
  non-empty accessible name that states the CC and its current actual-vs-plan position as
  percentages at the current week.
- **R6.2** The sparkline's accessible name follows a live edit: after an edit that changes
  the CC's current actual position (while it stays a candidate), the text alternative
  changes accordingly.
- **R6.3** The sparkline renders without throwing for the degenerate case of a single
  observed week (weeks-elapsed edited to 1), and never emits `NaN` into its output or label.
- **R6.4** Non-candidate rows also render their plan-vs-actual sparkline (a quieter variant),
  with the same `role="img"` + accessible-name contract.

### R7 — Theme (system default, persisted override)
*As any visitor, I need the surface to respect my OS light/dark preference and remember my
explicit choice.*

- **R7.1** On first load with no stored preference, the theme follows the OS preference
  (`prefers-color-scheme`), applied as `data-theme` on the document element. Absent
  `matchMedia` support, the **initial-theme read** falls back to dark without throwing. This
  guard is a **cross-suite render precondition, not a theme-only detail**: jsdom does not
  implement `matchMedia`, and every test that mounts `MarkdownSurface`/`App` without stubbing
  it (the `surface`, `detail-panel`, `framing`, `a11y` suites here, the four rewritten prior
  surface suites, and `demo-presentation-pass-5/tests/a11y.test.tsx`) depends on it — so the
  guard must wrap the initial read on mount, not only the toggle handler, or those suites
  crash on render.
- **R7.2** The top-bar light/dark control switches the theme live (updates `data-theme`) and
  persists the chosen value to `localStorage`.
- **R7.3** A stored preference wins over the OS preference on subsequent loads (the override
  is honored).

### R8 — Empty state & quiet non-candidate section
*As a buyer who has cleared the list, I need a deliberate "nothing behind plan" state, not a
bare zero; and the on/ahead section must never dangle an empty count.*

- **R8.1** When the candidate count is zero, the surface renders a deliberate, affirmative
  empty state (a `role="status"` with copy such as "nothing is behind plan"), not a bare or
  absent list, and not a dangling "(0)" count over an empty list.
- **R8.2** The empty state is reachable by live edits (selling every candidate out) and
  shows no `NaN`; it is absent whenever at least one candidate exists.
- **R8.3** When the non-candidate count is zero, the on/ahead section is omitted rather than
  dangling a "(0)" heading over an empty list (the section renders **iff**
  `nonCandidates.length > 0`). **Reachability note:** non-candidate rows are read-only in the
  redesign, and editing a candidate only ever makes it *less* flagged, so the surface can
  never be driven to an all-flagged / zero-non-candidate state through the UI — this case is
  **structural / design-reviewed, not reachable via the UI** (same category as the zero-CC /
  single-CC states). The *reachable* failure mode — a dangling parenthesized-zero count over
  an empty list — is guarded on the candidate side (R8.1) where it can actually occur.

### R9 — Presentation copy layer & the one engine export
*As a maintainer, I need the redesign's added copy to stay out of the engine, and the one
engine addition to be a pure, behavior-preserving export.*

- **R9.1** `src/presentation.ts` exposes `REASON_META` and `TIER_META` — presentation copy
  (label, kind, rule/note text) only. `REASON_META` covers **every** `ReasonArchetype`
  (`seasonal-cliff`, `inventory-depth`, `decelerating`, `never-started`, `behind-plan`) so
  no engine-producible reason can render without a label. `TIER_META` covers all three tiers
  (First, Second, Clearance), and each `TIER_META` discount percentage equals the engine's
  percentage for that tier (so the copy layer can never disagree with the engine's number).
- **R9.2** `baseTierIndex` is exported from `src/tier.ts` unchanged: a pure function of a
  single magnitude argument returning a tier index in `{0,1,2}`, non-decreasing in its
  argument, and consistent with `recommendTier` — for any CC, the engine's chosen tier index
  is **≤** `baseTierIndex(tierMagnitude)` (the floor only ever caps to a shallower tier,
  never deepens). No other engine module changes.

### R10 — Accessibility baseline (AA-targeted)
*As a keyboard or screen-reader user, I need the surface navigable and legibly structured.*

- **R10.1** The page exposes a single `main` landmark and exactly one `h1`.
- **R10.2** Section headings ("Behind plan", "On / ahead of plan", and the empty-state
  heading when shown) are real heading elements nesting under the `h1` without skipping a
  level.
- **R10.3** Every interactive control (theme toggle buttons, seed input, regenerate, each
  candidate row's expand button, and — when a row is open — its four edit inputs) has a
  non-empty accessible name.
- **R10.4** Each rendered sparkline has a non-empty accessible name (R6.1).
- **Deferred (inherited acknowledged deviation):** color-contrast ratios, focus-visible
  styling, reflow/zoom, and a full WCAG 2.1 AA criterion-by-criterion audit are **not**
  verified here — the same AA-audit deferral demo-5 acknowledged (see constitution
  `## Acknowledged risks`).

### R11 — Determinism & regenerate
*As a buyer, I need the surface to be a pure function of seed + edits, and regenerate to
give a fresh, clean class.*

- **R11.1** Setting the seed to S renders exactly `generateProductClass(S)` evaluated —
  identical seed + identical edits ⇒ identical surface; re-entering the same seed rebuilds.
- **R11.2** Regenerate advances to a new seed (current + 1), rebuilds the class, **discards
  pending edits**, and **closes any open detail row**.

## Edge cases and failure modes
- **All candidates edited out** → R8.1/R8.2 empty state (tested).
- **All CCs flagged** → R8.3 omitted non-candidate section, no dangling "(0)" (tested).
- **Cleared/empty edit field** → R5.3 no-op, no `NaN` (tested).
- **Single observed week** (weeks → 1) → R6.3 sparkline still renders, no `NaN` (tested).
- **Floor edited up to force a cap** → R4.5 ladder marks the chosen (shallower) tier and the
  note explains the cap; the chosen index stays ≤ `baseTierIndex` (R9.2, unit-tested).
- **Missing `matchMedia`** → R7.1 dark fallback, no throw — directly tested in `theme.test.tsx`,
  and an implicit render precondition for every other suite that mounts the surface without
  stubbing it (see R7.1).
- **Unreachable by construction** (not designed for, not tested): zero CCs, single CC — the
  generator emits ≥ 8 CCs with ≥ 2 behind plan and there is no add/delete-CC control.

## Out of scope
As declaration: no engine/tier/classifier/generator/`Candidate`-shape change (`baseTierIndex`
is exported, not modified); no new editable control or change to F2's four; no component
library; no persisted settings beyond theme (density/accent/spotlight are hardcoded
defaults); no full WCAG AA audit; no deploy change; FLIP timing, SVG geometry, exact tokens,
and pixel fidelity are design-reviewed, not automated.

## Design

### Components & seams
- **`App.tsx` (thin shell).** Renders `<MarkdownSurface />` and nothing else — it must not
  introduce its own landmark, so the single `main` lives in `MarkdownSurface` (R10.1).
- **`MarkdownSurface` (new active surface).** Owns state: `seed`, `ccs` (working set; edits
  live here), `openId` (single-open accordion), and theme. Derives
  `{candidates, nonCandidates} = evaluateClass(ccs)` and a `byId` map via `useMemo`, exactly
  as the prior surface did — **no change to the data flow, the edit path, or the four
  controls.** Renders the top bar, hero, pipeline strip, the behind-plan box (anatomy +
  candidate list or empty state), the on/ahead box, and the footer.
- **Presentation components** (raw Tailwind, hand-rolled; no new deps): `PipelineStrip`,
  `Anatomy`, `CandidateRow`, `DetailPanel`, `EditField`, `NonCandidateRow`, `Sparkline`,
  and primitives `ReasonLabel` / `TierBadge` / `Stat` / `Icon` (the prototype's hand-drawn
  16px stroke set). A `useFlip` hook handles re-rank animation (inert under jsdom).
- **`src/presentation.ts` (new).** `REASON_META` / `TIER_META` copy — presentation only, no
  engine logic, imported by the row/badge/detail components.
- **`src/tier.ts` (one export added).** `baseTierIndex` becomes exported, unchanged.
- **Token layer.** CSS custom properties on `[data-theme]` (light/dark) per the handoff
  tokens, mapped into Tailwind via `theme.extend.colors` referencing `var(--token)`. Theme
  is applied by setting `data-theme` on the document element; density/accent ship as fixed
  defaults.
- **Frozen, read-only:** `data`, `engine`, `tier.recommendTier`, `explanation`,
  `trajectory`, `edit`, `pipeline`, `types`, and `CandidateSurface.tsx` (the F1/F3 harness).
  This feature reads their output; it changes none of them.
- **Removed:** `CustomizationView.tsx`, `TrajectoryChart.tsx`.

### Behavioral properties the seams must hold
- **Partition & order preserved.** The rendered candidate/non-candidate split and the
  candidate order are exactly `evaluateClass`'s — the redesign layers presentation around the
  engine output, never filtering or re-sorting it independently.
- **Engine numbers are pass-through.** Tier %, discounted price, gap points, and the
  explanation sentence shown on a row are the `Candidate`'s own values / the engine's
  functions; `presentation.ts` contributes only labels/kinds/notes, never a recomputed
  number (so R9.1's percentage-agreement check is a real anti-drift guard).
- **Ladder consistency.** The detail ladder's base-tier reasoning uses the engine's exported
  `baseTierIndex`; the chosen tier is the engine's recommended tier; R9.2's `chosen ≤ base`
  invariant guarantees the "capped" note fires exactly when the engine actually capped.
- **Single-open accordion.** At most one `DetailPanel` is mounted; `openId` is the only open
  row. Regenerate/seed-load resets `openId` to null (R11.2).
- **Four-controls invariant.** With a row open, exactly four `spinbutton`s exist in it; the
  expand control and theme toggles are `button`s, not spinbuttons (preserves F2).
- **Determinism.** Identical seed + identical edits ⇒ identical surface; no randomness or
  async in the view layer.

### Reuse
- Reuses the established **raw-Tailwind, hand-rolled-component** pattern from F1–F5 (no
  component library, no icon dependency) — the prototype's CSS-var token layer slots into the
  existing Tailwind config.
- Reuses the unchanged engine seam: `generateProductClass`, `evaluateClass`,
  `buildCandidates`, `applyEdit`, `buildTrajectory`, `recommendTier`, `classifyReason`,
  `composeExplanation` — and the `EditableField` union from `edit.ts`.
- Reuses the repo's test wiring (Vitest + RTL + jsdom, `@/` alias, the
  `features/**/tests/**` include glob) — no config change.

### Reconciliation of prior suites (consequence of replacing the active surface)
Deleting `CustomizationView` / `TrajectoryChart` breaks the four prior **`@scaffolding`**
surface suites that imported them. Per the owner's decision, they are **rewritten** to target
`MarkdownSurface` under the new interaction model, preserving each prior feature's surviving
behavioral intent and updating it only where the redesign legitimately changes the surface:
- `live-customization-2/tests/surface.test.tsx` — full-class render, **four editable controls
  per CC reached by expanding the row**, live recompute on sold-out, deterministic seed,
  regenerate discards edits. (Edits now live in the detail panel.)
- `plan-vs-actual-drilldown-4/tests/surface.test.tsx` — every candidate row shows a
  plan-vs-actual chart (`role="img"`) with a text alternative stating the current actual %;
  the chart updates on a live edit; renders for a degenerate single-observed-week CC; no
  `NaN`. (The chart is now the **always-visible sparkline**, not an on-demand toggle — the
  "collapsed by default" assertion is dropped as no longer true; the F4 unit suite
  `trajectory.test.ts` is untouched.)
- `demo-presentation-pass-5/tests/framing.test.tsx` — the determinism framing is now an
  **always-on** frame (pipeline strip / footer) rather than a disclosure; rewritten to assert
  the thesis is communicated and coexists with the lists, adding no editable control.
- `demo-presentation-pass-5/tests/empty-state.test.tsx` — same empty-state behavior under the
  new model (the sell-out helper expands a row before editing).

Untouched and still passing as-is: every engine/module unit suite (`engine`, `generator`,
`tier`, `pipeline`, `recompute`, `edit`, `reason`, `severity`, `lockstep`,
`trajectory.test.ts`), the `CandidateSurface` suites (`core-1/surface`,
`explanation-3/surface`), the F6 deploy suites, and **`demo-presentation-pass-5/tests/
a11y.test.tsx`** — it renders `App`, and `MarkdownSurface` satisfies its `@frozen`
contracts (one `main`, one `h1`, non-skipping headings, named controls, declared lang)
unchanged.

## Coverage

| Requirement / seam | Verified by |
|---|---|
| R1.1 partition matches engine (no CC dropped/duplicated) | `surface.test.tsx` › renders the whole class as engine-partitioned |
| R1.2 candidate order = engine severity order | `surface.test.tsx` › candidate order matches buildCandidates |
| R1.3 row shows reason label + tier badge (engine %) + meta read | `surface.test.tsx` › each row shows reason, tier+%, and meta; `presentation.test.ts` (% agreement) |
| R1.4 / R5.3 no NaN | `surface.test.tsx`, `detail-panel.test.tsx`, `theme.test.tsx` (no-NaN guards) |
| R2.1 pipeline strip — 5 named steps | `framing.test.tsx` › pipeline strip lists the five steps |
| R2.2 determinism thesis visible without interaction | `framing.test.tsx` › states the deterministic-not-AI thesis |
| R2.3 anatomy block present with candidates | `framing.test.tsx` › renders the how-to-read-a-row anatomy |
| R2.4 top bar (brand/seed/theme), adds no editable control | `framing.test.tsx`, `a11y.test.tsx` (named controls) |
| R3.1 severity meter present & reason-encoded (non-zero) | `surface.test.tsx` › every candidate row exposes a severity meter |
| R3.2 / R4.1 chevron + collapsed-by-default detail | `detail-panel.test.tsx` › collapsed by default |
| R3.3 explanation strips leading name, else engine text | `surface.test.tsx` › explanation rendered without the leading name |
| R4.2 expand toggles aria-expanded | `detail-panel.test.tsx` › toggles open/closed |
| R4.3 single-open accordion | `detail-panel.test.tsx` › opening one row closes another |
| R4.4 why-flagged shows gap = gapPoints | `detail-panel.test.tsx` › why-flagged shows the gap in points |
| R4.5 tier ladder: 3 tiers, clears/below floor, chosen marked, cap note | `detail-panel.test.tsx` › renders the three-tier ladder with the chosen tier |
| R4.6 exactly four edit fields in an open row | `detail-panel.test.tsx` › four editable controls in the open detail |
| R5.1/R5.2 live recompute & re-partition (sold-out drops) | `detail-panel.test.tsx` › editing to sold-out drops the candidate |
| R5.4 re-rank reorders DOM (animation not asserted) | `detail-panel.test.tsx` › list reflects the engine's new order |
| R6.1 sparkline role=img + actual/plan % name | `surface.test.tsx`, `a11y.test.tsx` › sparkline has an actual-vs-plan label |
| R6.2 sparkline label follows a live edit | `plan-vs-actual-drilldown-4/tests/surface.test.tsx` (rewritten) |
| R6.3 degenerate single-week renders, no NaN | `plan-vs-actual-drilldown-4/tests/surface.test.tsx` (rewritten) |
| R6.4 non-candidate rows render a sparkline too | `surface.test.tsx` › non-candidate rows carry a sparkline |
| R7.1 system-preference default + matchMedia-absent fallback | `theme.test.tsx` › defaults to OS preference; falls back without matchMedia |
| R7.2 toggle switches theme + persists | `theme.test.tsx` › toggling sets data-theme and persists |
| R7.3 stored override wins on reload | `theme.test.tsx` › a stored preference overrides the OS default |
| R8.1/R8.2 empty state status, candidate-side no dangling "(0)" | `demo-presentation-pass-5/tests/empty-state.test.tsx` (rewritten) |
| R8.3 non-candidate section renders iff count > 0 | **Structural / design-reviewed — unreachable via UI** (read-only non-candidate rows; see R8.3 reachability note). The reachable mutual-exclusion guard is the candidate-side R8.1 test. |
| R9.1 REASON_META covers all archetypes; TIER_META %=engine | `presentation.test.ts` › meta covers every reason and tier with agreeing % |
| R9.2 baseTierIndex exported, pure, chosen ≤ base | `presentation.test.ts` › baseTierIndex is pure and consistent with recommendTier |
| R10.1 main + single h1 | `a11y.test.tsx` (this feature) + `demo-5/a11y.test.tsx` (App) |
| R10.2 non-skipping headings | `a11y.test.tsx` › headings nest without skipping |
| R10.3 controls have accessible names | `a11y.test.tsx` › all interactive controls are named |
| R10.4 sparkline accessible name | `a11y.test.tsx` › every sparkline is named |
| R11.1 deterministic seed render | `live-customization-2/tests/surface.test.tsx` (rewritten) |
| R11.2 regenerate advances seed, discards edits, closes detail | `live-customization-2/tests/surface.test.tsx` (rewritten) + `detail-panel.test.tsx` |
| FLIP timing / SVG geometry / tokens / pixel fidelity | **Design review — not automated** (jsdom computes no layout) |
| Frozen F1–F6 envelope unchanged | Existing engine/module + CandidateSurface + deploy suites, unmodified |

## Adversarial gate

**Mode:** independent clean-context sub-agent (general-purpose), run once against the drafted
spec and tests. It also ported the engine to validate seed-42/seed-7 output empirically (7
candidates + 4 non-candidates at seed 42; the sold-out→promote chain; the floor-cap ladder
invariant; the single-week section-move; sparkline a11y). No security findings (static
client-side SPA, synthetic data, no network/auth; the one engine export is pure) — so no fix
re-gate was required. No HIGH findings.

| # | Severity | Lens | Finding | Disposition |
|---|----------|------|---------|-------------|
| 1 | MEDIUM | Coverage / Integrity | The Coverage table mapped R8.3 to a non-existent test, and R8.3's "omit the on/ahead section when its count is zero" is unreachable via the UI (non-candidate rows are read-only; editing only makes a CC *less* flagged), so a `/build` that dropped the `nonCandidates.length > 0` guard could pass green. | **Fixed** — R8.3 reworded to mark the non-candidate-side omission **structural / design-reviewed (unreachable via UI)**, in the same category the spec already uses for the zero-CC / single-CC states; the Coverage row now points to the reachable candidate-side guard (R8.1) and labels R8.3 design-reviewed rather than claiming a test. |
| 2 | LOW | Failure modes | R7.1's `matchMedia` fallback reads as theme-suite-only, but it is a precondition for every suite that mounts the surface without stubbing `matchMedia` (jsdom has none); a `/build` author could guard only the toggle handler and crash ~9 suites on render. | **Fixed** — R7.1 and the Edge-cases line now name the guard as a cross-suite render precondition that must wrap the initial-theme read on mount, listing the dependent suites. |

**Cleared by the gate (no action):** R9.2's `chosen ≤ baseTierIndex(tierMagnitude)` invariant is
structural in `recommendTier` (verified across seeds 1/7/42/100/2024) and the ladder reads the
true `tierMagnitude` via `evaluate`, so "intended vs. capped" can't diverge; the seed-42
candidate/non-candidate assumptions all hold (incl. the duplicate-name case, which no test keys
on at a non-unique rank); icons are `aria-hidden` so `getAllByRole('img')` picks up only
sparklines; the rewritten prior suites preserve their features' surviving contracts (F2
four-controls/recompute/regenerate, F4 always-visible sparkline correctly dropping the obsolete
"collapsed by default" assertion, demo-5 always-on framing + empty state) without quiet
weakening; heading-nesting (R10.2) is correctly enforced by `a11y.test.tsx` even though the
prototype's `<span>`/`<h3>` markup would not satisfy it (the spec is the contract); no security
surface; HIG-native lens N/A (web platform).
