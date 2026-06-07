# Spec — Live Customization

*Roadmap #2. Declaration: `features/live-customization-2/declaration.md`. Builds on the frozen seams of `core-candidate-surface-1` (the `Candidate` shape, `evaluate`, `recommendTier`, `composeExplanation`, `generateProductClass`, `buildCandidates`).*

Make the engine interactive. Render the full synthetic class — ranked markdown candidates plus the on/ahead-of-plan CCs — let the buyer inline-edit four scalar inputs per CC with **live recompute**, and add a visible/editable **seed** with a **"regenerate sample"** control. Edits are **clamped at the control** so the generator's invariants always hold; the engine itself is unchanged from F1.

---

## Behavioral requirements

### Domain vocabulary (delta from F1)
- **Editable scalar inputs** — exactly four per CC: **actual sell-through** (`actualCumulativeFraction`), **price**, **liquidation floor**, **weeks elapsed** (`weeksElapsed`). These are the inputs that drive a live recompute under F1's engine. Plan curve and inventory are *not* editable this feature (see Out of scope).
- **Candidate / non-candidate** — a CC is a *candidate* iff F1's `evaluate(cc).flagged` is true (behind plan beyond the flag threshold). All other CCs are *non-candidates* (on plan, ahead, or behind-but-below-threshold). F1 rendered candidates only; F2 renders both, candidates ranked and focal, non-candidates present and de-emphasized.
- **Clamp** — when a buyer enters a value outside a field's permissible range, the value is constrained to the nearest in-range boundary before it reaches the engine. The permissible range for each field is computed from the CC's *current other values*, so no single edit can violate an invariant.
- **Seed** — the integer the generator is seeded with. Visible and editable; it is the reproducibility handle (US-5 from F1, now surfaced).

### User stories

**US-1 — The whole class is visible.**
As a buyer, I see every CC in the class, with the behind-plan candidates ranked and focal and the rest present but de-emphasized, so I can edit any CC — not only the ones already flagged.
- *Acceptance:* On load, a class is generated from the displayed seed and rendered. The flagged CCs appear as a severity-ranked candidate list (identical content to F1's surface); the non-flagged CCs are also rendered, visually distinguished. Every CC appears exactly once.

**US-2 — Inline-edit a CC's inputs.**
As a buyer, I can edit a CC's actual sell-through, price, liquidation floor, and weeks elapsed directly in place.
- *Acceptance:* Each CC exposes four editable, accessibly-labeled, keyboard-reachable numeric controls — one per editable field. No other field is editable.

**US-3 — Live recompute.**
As a buyer, when I change an input the candidate list, tiers, and explanations update immediately, with no reload or button press.
- *Acceptance:* Editing a CC's actual sell-through up to fully-sold (gap ≤ 0) removes it from the candidate list live; editing a CC far enough behind plan adds it to the candidate list with a tier and explanation; the list re-ranks by severity after the edit. Editing price/floor updates that candidate's recommended tier and discounted price live.

**US-4 — Edits stay within bounds (clamp).**
As a buyer, I can't enter a value that breaks the model — out-of-range inputs are constrained automatically.
- *Acceptance:* After any edit, every CC still satisfies `actual ∈ [0,1]`, `0 < floor ≤ price×0.85`, `price > 0`, `weeksElapsed ∈ [1, weeksTotal−1]` (integer), `weeksElapsed + weeksRemaining = weeksTotal`. The recommended `discountedPrice` is never below the floor, and the "no markdown headroom" case never arises. No edit ever produces a non-finite (`NaN`/`Infinity`) value anywhere in the recomputed output.

**US-5 — Regenerate, deterministically, from a visible seed.**
As a buyer, I can regenerate a fresh sample, and I can set the seed to reproduce or share a specific one.
- *Acceptance:* A regenerate control advances to a new seed (different from the current one), rebuilds the class, and **discards any pending edits**. The seed is displayed and editable; setting it to a value `S` renders exactly the class `generateProductClass(S)` evaluated, and the same `S` always renders the same screen.

**US-6 — Unchanged engine.**
As a buyer (and as a test), turning the screen interactive did not change the verdicts: an untouched, freshly-generated class produces the same candidates F1 produced.
- *Acceptance:* For any seed, the candidate sub-list of the full-class recompute is identical to F1's `buildCandidates(seed)` — same membership, order, tiers, gap points, and explanations.

### Edge cases and failure modes
- **All CCs flagged.** The non-candidate region renders empty without error; the candidate list renders all CCs. (The generator guarantees ≥1 behind, never that any are ahead.)
- **No CCs flagged after edits.** If the buyer fixes every candidate (each edited to on/ahead of plan), the candidate list renders empty without error and all CCs appear as non-candidates. (F1's empty-list rendering is inherited.)
- **Out-of-range / nonsensical input.** Entering `2` for a sell-through fraction, a floor above `price×0.85`, a price below `floor/0.85`, a fractional or zero/negative weeks-elapsed, or clearing a field to empty: the value is clamped to the nearest valid boundary (empty/non-finite input is a no-op leaving the prior valid value). The recompute never shows `NaN` and never crashes.
- **Cross-field clamp.** Lowering price so far that the current floor would exceed `price×0.85` clamps the *price* edit at `floor/0.85` (the edit constrains the field being edited; it never silently rewrites the floor). Symmetrically, raising the floor clamps it at `price×0.85`.
- **Weeks-elapsed moves "now."** Editing `weeksElapsed` re-reads the planned cumulative fraction at the new week (`planCurve[weeksElapsed−1]`) and updates `weeksRemaining`; gap, severity, flag, tier, and explanation all recompute from the new week.
- **Untrusted-looking text.** CC names and explanations remain rendered as text, not HTML (inherited from F1). No new untrusted input enters the system — the four editable inputs are numeric and clamped; names/explanations still originate only from the deterministic generator/composer.

### Out of scope (this feature)
- Editing the plan curve (per-week array — Roadmap #4 drill-down) or inventory units (inert under F1's engine — deferred to Roadmap #3).
- Richer explanation vocabulary and inventory-depth/seasonal-cliff signals (Roadmap #3).
- Per-CC plan-vs-actual curve drill-down (Roadmap #4).
- Designed empty/edge-state treatment, on-screen thesis framing, visual polish, full WCAG 2.1 AA audit (Roadmap #5).
- Per-field revert of a single edited CC (regenerate is the only reset); persistence of edits or seed across reloads; deploy (Roadmap #6).

---

## Design

Two new pure functions over F1's pipeline plus one interactive React surface. Still fully client-side: no backend, no persistence, no network. The decision engine, tier recommender, and explanation composer are **reused unchanged** from F1; F2 only adds an edit-clamp seam, a whole-class recompute seam, and the interactive surface that drives them.

### Seams

Module/function names and field names are the provisional surface `/build` implements against; the **behavioral properties** are the contract. The stable, externally-observable seams are the recompute output and the rendered surface.

**1. Edit clamp** — `applyEdit(cc, field, value) → CC`  *(field ∈ {`actualCumulativeFraction`, `price`, `liquidationFloor`, `weeksElapsed`})*
- Pure: returns a new CC; the input CC and all other CCs are untouched.
- Changes only the targeted field, except editing `weeksElapsed` also updates the derived `weeksRemaining = weeksTotal − weeksElapsed` (they are a coupled pair, not two independent fields).
- Clamps the edited field to the range that preserves every invariant, computed from the CC's current other values:
  - `actualCumulativeFraction` → `[0, 1]`.
  - `price` → `[liquidationFloor / 0.85, ∞)` and `> 0` (so `floor ≤ price×0.85` always holds).
  - `liquidationFloor` → `(0, price × 0.85]`.
  - `weeksElapsed` → integer in `[1, weeksTotal − 1]`.
- Robust to bad input: a non-finite or empty `value` returns the CC unchanged (no-op). The returned CC always satisfies F1's full generator invariant set.

**2. Whole-class recompute** — `evaluateClass(ccs) → { candidates, nonCandidates }`
- `candidates`: exactly the CCs for which `evaluate(cc).flagged` is true, each a `Candidate` with the **identical shape and field semantics** F1 froze (`id, name, price, liquidationFloor, severity, weeksRemaining, gapPoints, tier, discountPct, discountedPrice, explanation`), sorted by `severity` descending. Floor invariant holds for every element (`discountedPrice ≥ liquidationFloor`).
- `nonCandidates`: exactly the remaining CCs, each carrying at least `id, name, price, gapPoints, weeksRemaining` and a `flagged: false` marker. No tier or explanation (they are not markdown candidates).
- **Total, disjoint partition:** every input CC appears in exactly one list; `candidates.length + nonCandidates.length === ccs.length`.
- Deterministic: deep-equal `ccs` in ⇒ deep-equal result out.
- **F1 lockstep (the anchor):** `evaluateClass(generateProductClass(seed)).candidates` deep-equals `buildCandidates(seed)` for every seed — same membership, order, tiers, gap points, and explanations. The two entry paths must not drift. *(This is an output-equality property, not an implementation constraint; `/build` may satisfy it by composing one through the other.)*

**3. Interactive surface** — a React component rendering and driving a working class
- On mount, generates a class from a starting seed and renders it via `evaluateClass`: a ranked candidate region (reusing F1's candidate-row presentation: name + tier-with-percentage + explanation) and a visually-distinguished non-candidate region. Every CC is rendered exactly once.
- Each CC row exposes four editable numeric controls (actual sell-through, price, floor, weeks elapsed), each with an accessible label and keyboard-reachable. Editing a control applies `applyEdit` and re-renders via `evaluateClass` — live, no reload. The control reflects the clamped value (an out-of-range entry shows the clamped result).
- A seed control (labeled, editable) drives generation; a regenerate control (a real button) advances to a **new seed different from the current one**, rebuilds the class, and discards pending edits. Setting the seed to `S` renders `evaluateClass(generateProductClass(S))`; the same `S` renders identically.
- Editable controls operate in the buyer's natural units; the surface clamps each entry to the field's valid range before recompute (an absurd sell-through entry resolves to fully-sold, an absurd floor entry resolves to the floor cap). Clamping is asserted by observable behavior, not by a fixed input-unit convention.
- Renders candidate/non-candidate text as text content, never as HTML (inherited). Uses semantic structure (heading + list/table rows with ARIA roles, as in F1) so it stays keyboard-navigable; full WCAG 2.1 AA audit deferred (Roadmap #5).

### Constraints summary (behavioral)
- **Invariants always hold post-edit:** `actual ∈ [0,1]`, `0 < floor ≤ price×0.85`, `price > 0`, `weeksElapsed ∈ [1, weeksTotal−1]` integer, `weeksElapsed + weeksRemaining = weeksTotal`. *(US-4)*
- **Floor never breached; no-headroom never arises:** every recommended `discountedPrice ≥ liquidationFloor`, for edited inputs too. *(US-4)*
- **No non-finite output:** no edit (including empty/`NaN`/`Infinity` entry) yields `NaN`/`Infinity` anywhere in the recompute. *(US-4, failure modes)*
- **Live transitions:** fully-sold ⇒ leaves candidates; far-enough-behind ⇒ enters candidates; re-rank by severity after each edit. *(US-3)*
- **Total partition:** every CC appears exactly once across candidates + non-candidates. *(US-1)*
- **Determinism & F1 lockstep:** same seed ⇒ identical screen; unedited candidates deep-equal `buildCandidates(seed)`. *(US-5, US-6)*
- **Regenerate discards edits.** *(US-5)*
- **Text not HTML; semantic, keyboard-reachable structure.** *(inherited from F1)*

### Standards notes
- **OWASP Top 10:** Still no backend/auth/persistence/network. The only new input surface is the four numeric controls; they are parsed and clamped (A03 hardening against `NaN`/`Infinity`, not injection). Names and explanations still originate solely from the deterministic generator/composer and render as text — the injection surface is unchanged from F1, which already addressed it.
- **WCAG 2.1 AA:** New interactive controls get structural accessibility now (labeled inputs, real buttons, keyboard reachability) because it is cheap at creation and expensive to retrofit — the same owner decision F1 made. A full AA audit (contrast, complete ARIA, focus management) stays deferred to Roadmap #5.
- **OpenAPI / Apple HIG:** Not applicable (no API; web platform per declaration `## Platform`).

### Pattern reuse
- **Reuses, unchanged:** F1's `evaluate` (decision engine), `recommendTier` (tier recommender), `composeExplanation` (explanation composer), `generateProductClass` (generator), and the `Candidate` shape. `evaluateClass` composes these; it does not reimplement them. The F1-lockstep property is the executable guard that this reuse is genuine.
- **Not reuse:** the interactive surface is a new component. It presents candidate rows in the same shape F1's `CandidateSurface` does, but adds editing, the non-candidate region, and seed/regenerate controls — partial overlap, so not marked as reuse. `/build` may factor the shared row presentation out of F1's component or not, at its discretion.

---

## Coverage

| Requirement / seam | Verified by |
|---|---|
| US-1 full class rendered, candidates + non-candidates, each CC once | `surface.test.tsx` (both regions render, counts), `recompute.test.ts` (total disjoint partition) |
| US-2 four editable labeled controls per CC, nothing else editable | `surface.test.tsx` (four labeled controls per row, keyboard-reachable) |
| US-3 live recompute: in/out of candidacy, re-rank, tier update | `recompute.test.ts` (edit flips candidacy via `applyEdit`+`evaluateClass`), `surface.test.tsx` (edit sell-through→leaves list; edit floor→tier shallower; live, no reload) |
| US-4 clamp keeps invariants; floor never breached; no NaN | `edit.test.ts` (per-field clamp ranges, cross-field clamp, non-finite no-op, invariant set), `surface.test.tsx` (out-of-range entry clamps; no `NaN` in output) |
| US-5 regenerate discards edits; seed visible/editable/deterministic | `surface.test.tsx` (seed change re-renders; same seed identical; regenerate reverts an edit) |
| US-6 engine unchanged — F1 lockstep | `recompute.test.ts` (`evaluateClass(generateProductClass(seed)).candidates` deep-equals `buildCandidates(seed)`) |
| Edge: all flagged / none flagged render without error | `recompute.test.ts` (all-flagged, none-flagged partitions), `surface.test.tsx` (empty non-candidate / empty candidate region) |
| Edge: weeks-elapsed moves "now" (re-reads plan curve, updates weeksRemaining) | `edit.test.ts` (weeksElapsed edit updates weeksRemaining + recompute uses new week) |
| Seam #1 `applyEdit` purity + clamp | `edit.test.ts` |
| Seam #2 `evaluateClass` partition + determinism + lockstep | `recompute.test.ts` |
| Seam #3 surface structure (heading, semantic rows, text-not-HTML) | `surface.test.tsx` |

---

## Adversarial gate

Mode: independent clean-context gate (fresh sub-agent, review-only). Ran once against the drafted spec and tests. No HIGH findings — the spec is buildable as written. The gate explicitly cleared the highest-risk areas: the F1-lockstep equality (legitimate behavioral output-equality, composable, not over-constraining), the `0.85` floor-ratio constant in the clamp tests (coupling to a real F1 contract, not an arbitrary internal), candidate row-order assumptions (severity-sorted by contract), the security surface (numeric/clamped inputs, no new injection vector), and WCAG structural accessibility (labeled controls + semantic rows asserted). One MEDIUM and three LOW were dispositioned **fixed**; none acknowledged, so no rows were added to `constitution.md`'s Acknowledged risks. No security findings, so no security re-gate was triggered.

| # | Severity | Lens | Finding | Disposition |
|---|----------|------|---------|-------------|
| 1 | MEDIUM | Coverage (tests) | The surface floor→tier test asserted an absolute post-state (`First`); if seed-42's top candidate already recommended First it would pass without the floor edit/clamp/recompute doing anything, leaving the "editing floor changes the tier" behavior unproven. | **Fixed** — removed the fragile surface test (F1's explanation text also repeats the tier name, defeating a text probe, and no seed-agnostic floor edit guarantees an observable change). Added a deterministic deeper→First *transition* test on controlled data in `recompute.test.ts`; surface recompute-wiring stays proven by the sell-through test. |
| 2 | LOW | Integrity (tests) | `recompute.test.ts`'s `@frozen` header also called the `evaluateClass` import path "provisional" — a literal reader could freeze the path the spec says is renamable. | **Fixed** — header now scopes `@frozen` to the assertions and explicitly exempts the import name/location. |
| 3 | LOW | Coverage (tests) | Spec makes `gapPoints` a contract field on non-candidates, but nothing asserted it was even present/finite; a build dropping it (or emitting `NaN`) on non-candidates would pass. | **Fixed** — the partition test now asserts every non-candidate's `gapPoints` is a finite integer. |
| 4 | LOW | Coverage (tests) | The "no non-finite output" claim was checked only via `not.toMatch(/NaN/)` on rendered body text — a value formatted away (e.g. `Infinity`→blank) would slip through. | **Fixed** — added a `recompute.test.ts` test that sweeps every numeric field of `evaluateClass(...)` output after a battery of pathological edits and asserts `Number.isFinite`. |
