# Spec — Demo Presentation Pass (Feature 5)

Presentation polish over the working F1–F4 engine, rendered on the active surface
`CustomizationView`. Three threads — expandable thesis framing, designed empty states,
and a visual polish pass — none of which touch the deterministic core. The frozen
envelope (engine, tier, classifier, generator, `Candidate` shape, F2's four controls,
the trajectory chart, the F1↔F2↔F3↔F4 lockstep) is read-only here.

## Behavioral requirements

### R1 — Expandable thesis framing
*As a hiring manager landing on the tool cold, I need a way to learn what this tool
decides and why it is trustworthy, without it being forced on me or cluttering the
working screen.*

- **R1.1** The surface renders a single thesis-framing disclosure — a control (its
  accessible name names the concept, e.g. "How this works") paired with a region of
  explanatory content.
- **R1.2** The disclosure is **collapsed by default**: on first render the explanatory
  content is not present/visible, and the control reports the collapsed state via
  `aria-expanded="false"`.
- **R1.3** Activating the control reveals the content and flips `aria-expanded` to
  `"true"`; activating again collapses it. The state is keyboard-operable (the control
  is a native `button`, focusable and toggled by Enter/Space).
- **R1.4** When expanded, the content communicates the project thesis — that the
  recommendations are **deterministic / rule-based, not an AI or optimizer black box**,
  and that the **decision stays with the buyer**. (Asserted on concept, tolerant of exact
  wording.)
- **R1.5** The framing is presentation-only: it adds no editable control and does not
  alter the candidate / non-candidate lists, which render alongside it as before.

### R2 — Designed empty state (no candidates)
*As a buyer who has just resolved (or never had) any markdown candidates, I need the
screen to tell me clearly that nothing is behind plan — not show me a bare "(0)" over an
empty list.*

- **R2.1** When the candidate count is zero, the surface renders a deliberate empty-state
  message in the candidates region — affirmative, plain-language ("nothing behind plan" /
  "every CC is tracking to plan"), exposed as a status (`role="status"`), not merely an
  absent list.
- **R2.2** The empty state appears in response to live edits: starting from the default
  seed, editing every candidate out of candidacy (e.g. sell-through to sold-out) leaves
  zero candidate rows and shows the empty-state message. No `NaN` appears anywhere.
- **R2.3** When at least one candidate exists, the empty-state message is **not** present
  (it is mutually exclusive with a non-empty candidate list).

### R3 — Graceful "everything flagged" (empty non-candidate section)
*As a buyer in the case where every CC is behind plan, I need the on/ahead-of-plan
section to not look broken.*

- **R3.1** When the non-candidate count is zero, the non-candidate section does not render
  a bare heading over an empty list: it either omits the section or shows a short
  placeholder. (Either is acceptable; the failure mode is a dangling empty `(0)` list.)
- **R3.2** The candidate list continues to render normally in this case; no `NaN` appears.

### R4 — Accessibility baseline (AA-targeted)
*As a keyboard or screen-reader user, I need the surface to be navigable and legibly
structured.*

- **R4.1** The page exposes a `main` landmark and exactly one `h1`.
- **R4.2** The list-section headings ("Behind plan", "On / ahead of plan") use real
  heading elements in a non-skipping order under the `h1`. The thesis framing (R1) is a
  **disclosure** — a `button` with `aria-expanded`, not a heading; `/build` may optionally
  wrap its trigger in a heading for landmark navigation, but the contract here is only that
  whatever headings exist nest without skipping a level.
- **R4.3** Every interactive control (seed input, regenerate, the four per-CC edit inputs,
  the trajectory toggle, the framing disclosure) has a non-empty accessible name. (F2/F4
  controls already satisfy this; R4 forbids the polish pass from regressing it.)
- **R4.4** The document declares a language (`<html lang>`).
- **Deferred (acknowledged deviation):** color-contrast ratios, focus-visible styling,
  reflow/zoom, and a full criterion-by-criterion WCAG 2.1 AA audit are **not** verified
  here. See `## Adversarial gate` and the constitution's acknowledged-risks table.

### R5 — Visual polish (design-reviewed)
*As either audience, I need the surface to read as a finished, consistent, information-
dense dark tool.*

- **R5.1** The app is consistently dark (single dark surface; no light theme, no toggle).
- **R5.2** A codified, reused design treatment — a coherent spacing rhythm, a small type
  ramp, and a shared color palette — applied consistently across the framing, both list
  sections, rows, controls, and the empty state, matching the constitution aesthetic
  (information-dense, 14px base, tight line heights).
- **R5.3** No bespoke artwork and no component-library migration; raw Tailwind only.
- **Verification:** R5 is a design constraint verified by visual / design review, **not**
  by automated tests. jsdom computes no layout or applied styles, so asserting specific
  Tailwind class strings would test implementation shape, not appearance — explicitly not
  done (see Coverage). The one machine-checkable slice (a dark top-level surface exists)
  is covered incidentally by R4.1's landmark test plus the existing dark markup.

## Edge cases and failure modes
- **All candidates edited out** → R2 empty state (tested).
- **All CCs flagged** → R3 empty non-candidate section (tested).
- **Terminal/extreme inputs** (0 weeks remaining, 100% sold, floor = price) → already
  covered by F4's no-NaN surface tests; R2.2/R3.2 re-assert no `NaN` after the edits this
  feature drives.
- **Framing expanded while editing** → R1.5 / R5: framing and lists coexist; toggling the
  framing must not disturb the candidate list (tested: lists present with framing open).
- **Unreachable by construction** (not designed for, not tested): zero CCs, single CC —
  the generator emits ≥ 8 CCs with ≥ 2 behind and there is no add/delete control.

## Out of scope
As declaration: deploy (#6); any engine/tier/classifier/generator/`Candidate`-shape
change; new editable controls; component-library migration; bespoke artwork; full WCAG AA
sign-off; light theme / toggle; the unreachable zero-CC / single-CC states.

## Design

### Components & seams
- **`CustomizationView` (active surface, modified).** Gains: (1) a thesis-framing
  disclosure rendered above the lists; (2) conditional empty-state rendering for the
  candidates region when `candidates.length === 0`; (3) conditional handling of the
  non-candidate section when `nonCandidates.length === 0`; (4) consistent styling. It
  continues to derive `{ candidates, nonCandidates }` from `evaluateClass(ccs)` exactly as
  today — **no change to the data flow, the edit path, or the four controls.**
- **Thesis-framing disclosure.** A native `button` (`aria-expanded`) controlling a content
  region; React local state for open/collapsed, defaulting collapsed. Pure presentation;
  holds no domain state. May be an inline element or a small extracted component — an
  implementation choice for `/build`.
- **Empty-state element.** A `role="status"` block with affirmative copy, rendered in
  place of the candidate `<ul>` when there are no candidates.
- **Frozen, read-only:** `evaluateClass` / `buildCandidates` / the engine / tier /
  classifier / generator / `TrajectoryChart` / `CandidateSurface.tsx`. This feature reads
  their output; it changes none of them.

### Behavioral properties the seams must hold
- The candidate/non-candidate **partition and ordering are unchanged** — framing and
  empty-state are layered around the existing render, never reordering or filtering it.
- **Mutual exclusion:** the candidates region shows either a non-empty list **or** the
  empty-state status, never both, never neither. When a section is empty its bare
  "(0)" count heading is **not** rendered (the empty-state status replaces the candidate
  list+count; the non-candidate section is omitted or placeheld) — symmetric across both
  sections. The failure mode this forbids is a dangling parenthesized-zero count over an
  empty list, on *either* side.
- **No new editable control:** with the framing open, exactly four `spinbutton` controls
  per CC remain (F2 contract); the framing toggle and trajectory toggle are `button`s, not
  spinbuttons.
- **Determinism preserved:** identical seed + identical edits ⇒ identical surface; the
  framing/empty-state add no randomness or async.

### Reuse
- Reuses the established **raw-Tailwind, always-dark** pattern from F1–F4 (`darkMode:
  'class'` + `<html class="dark">` already in place). No new dependency, no `components.json`.
- Reuses the existing `candidate-row` / `noncandidate-row` test ids and the
  spinbutton/`button` role split that F4's surface suite already relies on. These remain
  `@scaffolding` surfaces (see tests); the polish pass must not break them.

## Coverage

| Requirement / seam | Verified by |
|---|---|
| R1.1 disclosure exists (control + region) | `framing.test.tsx` › renders a "how this works" disclosure |
| R1.2 collapsed by default (`aria-expanded=false`, content absent) | `framing.test.tsx` › collapsed by default |
| R1.3 toggles open/closed; keyboard-operable button | `framing.test.tsx` › expands and collapses on activation |
| R1.4 content communicates deterministic-not-AI + buyer-owns-decision | `framing.test.tsx` › expanded content states the thesis |
| R1.5 framing coexists with lists; adds no editable control | `framing.test.tsx` › lists still render with framing open |
| R2.1 / R2.2 empty-state status appears when candidates reach zero (no NaN) | `empty-state.test.tsx` › shows designed empty state when no candidates |
| R2.3 empty state absent when candidates exist | `empty-state.test.tsx` › no empty-state message while candidates exist |
| R3.1 / R3.2 no dangling empty non-candidate list; candidates still render | `empty-state.test.tsx` › empty non-candidate section handled gracefully |
| R4.1 main landmark + single h1 | `a11y.test.tsx` › exposes a main landmark and one h1 |
| R4.2 heading order non-skipping | `a11y.test.tsx` › headings nest under the h1 |
| R4.3 controls have accessible names (no regression) | `a11y.test.tsx` › all interactive controls have accessible names |
| R4.4 document language | `a11y.test.tsx` › document declares a language |
| R5 visual polish | **Design review — not automated** (see R5 Verification) |
| Frozen envelope unchanged | Existing F1–F4 suites (`pipeline`/`recompute`/`lockstep`/`surface`/`trajectory`), unmodified |

## Adversarial gate

**Mode:** independent clean-context sub-agent (general-purpose), run once against the
drafted spec and tests. No security findings, so no fix re-gate was required.

| # | Severity | Lens | Finding | Disposition |
|---|----------|------|---------|-------------|
| 1 | MEDIUM | Integrity | R4.2 listed "the framing" among required heading elements, contradicting R1's `button` disclosure design — `/build` would guess. | **Fixed** — R4.2 reworded: heading-order contract scoped to the list-section headings; the framing is a disclosure (heading-wrap optional). |
| 2 | MEDIUM | Coverage (tests) | Empty-state guard was asymmetric: R3 guarded the non-candidate side against a dangling "(0)" list, but the candidate side had none — a build could show the empty status *and* a "Behind plan (0)" empty list and pass. | **Fixed** — added a candidate-side `queryByText(/\(0\)/)` guard; made the design's mutual-exclusion property symmetric across both sections. |
| 3 | LOW | Coverage (tests) | R3's `/on \/ ahead of plan \(0\)/i` was coupled to the exact section name the R5 polish pass may rename → could pass vacuously. | **Fixed** — both guards re-keyed on the `(0)` count convention (the real failure mode), decoupled from the section name. |
| 4 | LOW | Standards/process | The WCAG AA deferral was surfaced in the spec but not yet recorded in the constitution's acknowledged-risks ledger, nor this gate section. | **Fixed** — this section written; WCAG-AA deferral row added to constitution.md `## Acknowledged risks`. |

**Cleared by the gate (no action):** both empty-state edit-loops provably terminate against
the real engine; the no-`NaN` guards are real; R5's "design-reviewed, not automated" is
honest (jsdom computes no layout/style); the `@frozen`/`@scaffolding` tags are correctly
placed; no scope drift; no security surface (static client-side SPA, synthetic data, no
backend/auth/network); HIG-native lens N/A (web platform).
