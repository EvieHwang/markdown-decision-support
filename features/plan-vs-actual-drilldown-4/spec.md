# Spec — Plan-vs-Actual Drill-Down

*Roadmap #4. Declaration: `features/plan-vs-actual-drilldown-4/declaration.md`. Builds on the frozen seams of `core-candidate-surface-1` (the `Candidate` shape, `evaluate`, the read-only surface), `live-customization-2` (`applyEdit`, `evaluateClass`, the interactive `CustomizationView` with exactly four editable controls per CC), and `explanation-depth-3` (`actualCurve` on `CC`, the reason classifier). This feature is **purely additive and read-only over the engine**: it visualizes data already on `CC` and adds no engine, tier, classifier, or `Candidate`-shape change.*

Turn the worded diagnosis into a picture. Today a row says "never got going — 40 pts behind, 4 wks left"; the buyer can read the *why* but not *see* the shape. This feature adds a per-CC, on-demand chart that draws the plan curve (full season) against the observed actual sell-through curve on a shared week axis, with the current week marked — available on every row, candidate and on-plan alike — and recomputing live with F2 edits. Hand-rolled SVG, no chart library. Deterministic; no LLM.

The decisions that shaped this spec (owner, during `/backlog` → `/spec`):
- **Placement: inline expand under the row** (collapsed by default), not a modal or a separate route — the tool stays a single screen.
- **Coverage: candidates *and* on-plan CCs** — an on-plan trajectory is cheap and legible, so every row gets the chart.
- **Annotations stay minimal**: plan line (full season), actual line (observed weeks), a current-week marker. No threshold band, no tier label, and **no printed gap number** inside the chart (the gap is authoritative on the row; the chart shows it as the visible distance between the lines).
- **The one real decision — honest chart under edits**: the actual line's terminal point is anchored to the engine's **live** current position (`weeksElapsed`, `actualCumulativeFraction`), not to the frozen `actualCurve`. Observed history draws solid; when an edit pulls the live point off the observed path, the divergent final segment draws distinctly (dashed). The chart can therefore never contradict the gap/tier/explanation the same row states.
- **`CandidateSurface.tsx` is left in place** — it is app-unused but still the test harness for the F1/F3 surface suites; deleting it would rewrite prior features' tests. Out of scope.

---

## Behavioral requirements

### Domain vocabulary (delta from F1–F3)
- **Plan series** — the full-season planned cumulative sell-through: one point per week across the whole season (`planCurve`, length `weeksTotal`), non-decreasing, ending ≈1.0. The fixed reference line; never affected by edits.
- **Observed-actual series** — the recorded weekly cumulative actual sell-through, **truncated to the current week**: the entries of `actualCurve` for weeks `1..min(weeksElapsed, actualCurve.length)`. On a fresh or sell-through-edited CC this is the whole recorded curve (its length already equals `weeksElapsed`); after a *downward* `weeksElapsed` edit it is the recorded curve clipped to the new current week, so no recorded "future" actual is ever drawn to the right of the current-week marker. Empty when `actualCurve` is absent. The weeks that have actually happened, as of the current week.
- **Live current point** — the engine's current actual position right now: `(weeksElapsed, actualCumulativeFraction)` read off the working (possibly edited) CC. This is what the engine's gap/tier/reason are computed from, so it is the authoritative endpoint the chart anchors the actual line to.
- **Divergence** — the live current point does not coincide with the observed-actual series at the current week, because an F2 edit moved the live position off the recorded path. This covers all three ways an edit can open a gap: a sell-through edit changes `actualCumulativeFraction` so its value differs from the recorded week-value; an *upward* `weeksElapsed` edit puts the current week *beyond* the recorded history; a *downward* `weeksElapsed` edit puts the current week *short* of the recorded tail, where the unchanged scalar no longer matches the (truncated) endpoint. When divergent, the final segment of the actual line connecting observed history to the live current point is the *hypothetical* part of the path.

### User stories

**US-1 — See the trajectory behind a flag.**
As a buyer, I can expand any row to see its plan curve and its actual sell-through drawn on one shared week axis, with the current week marked, so I can read the *shape* of how it fell behind — not just a sentence about it.
- *Acceptance:* Every row (candidate and non-candidate) exposes a control that reveals a per-CC chart drawing a plan series spanning the full season and an actual series over the observed weeks, sharing one week axis, with a current-week marker. Collapsed by default; revealed on demand. Rendered as SVG, no chart library.

**US-2 — The chart never lies relative to the row.**
As a buyer, when I edit a CC the picture moves with the verdict, so the chart and the row's numbers always agree.
- *Acceptance:* The actual line's terminal point is the engine's live current point `(weeksElapsed, actualCumulativeFraction)` of the working CC, not the frozen `actualCurve` endpoint. After an edit that changes `actualCumulativeFraction`, the chart's reported current-actual position changes to match. The chart prints no independent gap figure that could disagree with the row.

**US-3 — Honest history vs. hypothetical.**
As a buyer, I can tell the recorded sell-through path from a what-if I just typed, so an edit reads as exploration, not as rewritten history.
- *Acceptance:* The observed-actual series renders as a continuous solid path. When the live current point diverges from observed history (an edit moved it), the final connecting segment renders distinctly from the solid history (dashed). With no edit (live point coincides with observed history) there is no distinct hypothetical segment.

**US-4 — Robust without history.**
As a buyer (or a hand-built fixture), a CC with no `actualCurve` still charts without breaking.
- *Acceptance:* A CC lacking `actualCurve` renders the plan series and the live current point (a single observed position at the current week) with no solid history to draw, and never throws or produces a non-finite coordinate.

**US-5 — The drill-down doesn't disturb F2.**
As a buyer, opening a chart doesn't change how I edit — the four editable controls per CC and live recompute are exactly as before.
- *Acceptance:* Each CC still exposes exactly four editable controls (the chart toggle is not one of them, and reveals no new editable input). Live recompute, clamping, deterministic seed render, and regenerate behave exactly as in F2. The F1↔F2↔F3 lockstep and the `Candidate` shape are unchanged.

**US-6 — Legible to assistive tech.**
As a buyer using a screen reader, the chart is not a content-free image.
- *Acceptance:* The chart exposes a text alternative (an accessible name/role) that names the CC and states its current actual position in the buyer's units. (Full WCAG 2.1 AA audit deferred to Roadmap #5.)

### Edge cases and failure modes
- **No `actualCurve`.** US-4: plan series + live current point only; no solid history, no throw, no NaN.
- **Edit moves `actualCumulativeFraction`.** The live current point's value changes; the actual line re-anchors to it; the final segment becomes the dashed hypothetical (US-3). Observed history is unchanged (F2/F3 froze `applyEdit` to carry `actualCurve` through untouched).
- **Edit moves `weeksElapsed` up.** The current-week marker and the live current point's *week* move right; `actualCurve` length is unchanged, so the live current week sits *beyond* observed history. The solid history covers the weeks it has; the segment from the last observed week to the live current point is the dashed hypothetical. No throw, no non-finite coordinate.
- **Edit moves `weeksElapsed` down.** The current-week marker moves left, *behind* part of the recorded history. The observed-actual series is truncated to the new current week (it never draws recorded actuals to the right of "now"), and the unchanged `actualCumulativeFraction` no longer matches the truncated endpoint — so the CC is divergent and the segment to the live current point is the dashed hypothetical. No throw, no non-finite coordinate.
- **Single observed week (`weeksElapsed` clamped to 1).** The observed-actual series has exactly one point; there is no solid multi-point history to draw, only the live current point joined to that single observed point. Renders without error or non-finite coordinate — a path builder must not assume ≥ 2 points.
- **CC fully on/ahead of plan (a non-candidate).** Still charts: the actual line meets or sits above the plan line. No tier, no markdown framing in the chart — it is just the two curves.
- **Degenerate coordinates.** All plotted values are in `[0, 1]` (cumulative fractions) over weeks `1..weeksTotal`; the renderer maps these to the viewport. No data point produces `NaN`/`Infinity` (curves are finite by F1/F3 generator invariants; the live point is finite by F2's clamp).
- **Untrusted-looking text.** The chart introduces no new untrusted input — it reads numeric curves and renders an SVG plus a text label composed from the CC's name and numeric position. The name is rendered as text/attribute content (escaped), never as markup, consistent with F1. No new editable surface.

### Out of scope (this feature)
- Designed empty/edge-state treatment, on-screen thesis framing, visual polish, full WCAG 2.1 AA audit (Roadmap #5).
- Deploy (Roadmap #6).
- Making the curves or inventory editable; adding any editable control (F2 froze exactly four).
- A printed gap number, threshold band, tier annotation, tooltips, hover/zoom interactions, or axis tick labels beyond what a text alternative needs — deliberately minimal.
- Removing/refactoring `CandidateSurface.tsx` (still the F1/F3 test harness).
- Any change to the `Candidate` shape, the engine/tier/classifier, the tier label↔percentage mapping, the floor cap, or the F1↔F2↔F3 lockstep.

---

## Design

A read-only visualization layered onto the F2 interactive surface. A pure builder turns a working `CC` into the geometry-independent series the chart draws; a thin SVG renderer draws them; the row gains a collapse/expand toggle. The engine, tier recommender, classifier, pipeline, partition, and the four editable controls are reused **unchanged**. Still fully client-side: no backend, no persistence, no network, no new dependency (hand-rolled SVG).

### Seams

Module/function names and the test ids below are the provisional surface `/build` implements against (`@scaffolding` in tests); the **behavioral properties** are the contract. The stable, externally-observable seams are the trajectory builder's output and the rendered, accessible chart on each row.

**1. Trajectory builder (new, pure)** — `buildTrajectory(cc: CC) → Trajectory`
The honest-chart logic, extracted into a pure function so it is unit-testable without reading SVG geometry (mirrors how the engine/pipeline/edit logic is kept pure and separate from rendering). Deterministic in the CC. Produces:
- a **plan series**: one point per week `1..weeksTotal` with value `planCurve[week-1]` — spans the full season, non-decreasing, matches `planCurve`;
- an **observed-actual series**: one point per observed week, value `actualCurve[week-1]`, for weeks `1..min(weeksElapsed, actualCurve.length)` when `actualCurve` is present — i.e. the recorded curve **truncated to the current week** so a downward `weeksElapsed` edit never plots recorded "future" actuals; empty when `actualCurve` is absent;
- a **live current point**: `{ week: weeksElapsed, value: actualCumulativeFraction }` read from the working CC — the engine-live anchor;
- a **divergent** flag: true iff the live current point does not coincide with the observed-actual series at the current week — its value differs from the truncated endpoint, or the current week lies beyond the observed history. False on a fresh/unedited CC (where the recorded endpoint already equals the scalar); true after any of the three edit cases above moves the live position off the recorded path.
- Properties: every coordinate finite and in range (weeks ≥ 1; values in `[0,1]`); never throws, including when `actualCurve` is absent, when the observed series is a single point (`weeksElapsed` clamped to 1), or when `weeksElapsed` has been edited above or below the recorded history length. Deep-equal CC ⇒ deep-equal `Trajectory`.

**2. Trajectory chart (new, presentational)** — an SVG view rendering one `Trajectory`
- Draws the plan series as one path across the full week axis and the actual series anchored to the live current point. Observed history is a **solid** path; when `divergent`, the final segment to the live current point is drawn **distinctly (dashed)**; when not divergent, there is no separate hypothetical segment.
- Marks the **current week**.
- Prints **no gap number** and no tier — the row owns those. The gap is visible as the vertical distance between the two lines at the current-week marker.
- Exposes a **text alternative**: an accessible name/role (`role="img"` with an accessible name, or equivalent) naming the CC and stating its current actual position (e.g. "<name>: actual <N>% at week <w> of <total>"). This is both the WCAG non-regression and the stable probe a test reads to confirm the chart reflects the live position. The name is escaped text/attribute content, never markup.
- Pure function of its `Trajectory` prop: same prop ⇒ same output. No randomness, no network.

**3. Surface integration (reused + toggle)** — `CustomizationView` rows
- Each candidate row **and** each non-candidate row gains a collapse/expand control that reveals the trajectory chart for that CC, built from the *working* CC in `byId` (so edits flow through `evaluateClass`'s recompute and into `buildTrajectory` on the next render). Collapsed by default.
- The toggle is a `button` (not a `spinbutton`), so the F2 contract "exactly four editable controls per CC" is preserved: opening the chart reveals no new editable input. Inventory and the curves stay non-editable.
- Reuses the F2 row structure, the four `EditControls`, `evaluateClass` recompute, seed/regenerate, and clamping unchanged. The `noncandidate-row` / `candidate-row` test ids and four-spinbutton contract are untouched.
- Text-not-HTML rendering is inherited; the chart adds only numeric SVG geometry and an escaped text label.

### Constraints summary (behavioral)
- **Every row exposes an on-demand per-CC chart (plan full-season + actual observed, shared week axis, current-week marker), candidates and non-candidates alike; collapsed by default; SVG, no chart lib.** *(US-1)*
- **Actual line anchored to the engine-live `(weeksElapsed, actualCumulativeFraction)`; the chart prints no independent gap; editing sell-through moves the chart's reported actual position.** *(US-2)*
- **Observed history solid; divergent final segment (post-edit) distinct/dashed; no distinct hypothetical segment when not divergent.** *(US-3)*
- **No `actualCurve` ⇒ plan + live point only, no throw, no non-finite coordinate.** *(US-4)*
- **Exactly four editable controls per CC preserved; F1↔F2↔F3 lockstep, `Candidate` shape, live recompute / clamp / seed / regenerate all unchanged.** *(US-5)*
- **Chart carries a text alternative naming the CC and its current actual position; rendered as escaped text, not markup.** *(US-6, inherited injection posture)*

### Standards notes
- **OWASP Top 10:** No backend/auth/persistence/network. No new editable input surface — the curves and inventory are read-only; the four numeric controls and text-not-HTML rendering are inherited (A03 injection posture unchanged). The chart label is composed from the CC's own name + numeric position and escaped.
- **WCAG 2.1 AA:** New control (the expand toggle) is a native `button` with an accessible name; the chart is `role="img"` with an accessible name stating its content, so it is not a content-free graphic. Full AA audit (focus order, contrast tokens, reduced-motion, complete chart description) stays deferred to Roadmap #5 per the declaration — surfaced here, not silently absorbed.
- **OpenAPI / Apple HIG:** Not applicable (no API; web platform per declaration `## Platform`).

### Pattern reuse
- **Reuses, unchanged:** `evaluateClass` (recompute/partition/determinism), `applyEdit` (clamp; carries `actualCurve` through untouched), the F2 `EditControls` and four-control contract, seed/regenerate, and the `candidate-row`/`noncandidate-row` row structure. The F1↔F2↔F3 lockstep and `Candidate` shape are untouched — guarded by the prior features' suites, which continue to pass.
- **New:** the pure `buildTrajectory` builder, the SVG trajectory chart, and the per-row expand toggle.

---

## Coverage

| Requirement / seam | Verified by |
|---|---|
| US-1 on-demand per-CC chart on every row; plan full-season + actual observed; shared axis; collapsed by default; candidates *and* non-candidates | `surface.test.tsx` (each candidate and non-candidate row has an expand toggle; chart hidden until toggled, then present), `trajectory.test.ts` (plan series spans `weeksTotal` and equals `planCurve`; observed series equals `actualCurve`) |
| US-2 actual anchored to engine-live point; no independent gap; edit moves reported actual | `trajectory.test.ts` (live current point = `{weeksElapsed, actualCumulativeFraction}` of the working CC), `surface.test.tsx` (editing sell-through changes the chart's accessible current-actual figure) |
| US-3 observed history solid; divergent post-edit segment distinct; none when not divergent | `trajectory.test.ts` (`divergent` false on a fresh generated CC where live point = observed endpoint; true after `applyEdit` moves `actualCumulativeFraction`; true when `weeksElapsed` edited *up* past observed history; true when `weeksElapsed` edited *down* with the observed series truncated to the current week) |
| US-4 no `actualCurve` ⇒ plan + live point only, no throw / no non-finite; single-observed-week degenerate series renders | `trajectory.test.ts` (CC without `actualCurve`: empty observed series, finite live point, no throw; `weeksElapsed` edited to 1 → single-point observed series, finite, no throw), `surface.test.tsx` (a row whose weeks-elapsed is edited down to 1 still renders its chart without `NaN` — the degenerate series through the real renderer) |
| US-5 four editable controls preserved; lockstep/shape/recompute/seed/regenerate unchanged | `surface.test.tsx` (still exactly four spinbuttons per CC with the chart present; toggle is a button; live recompute on edit still removes a sold-out candidate; no `NaN`), prior F1/F2/F3 suites (unchanged, still green) |
| US-6 chart carries a text alternative naming CC + current actual position; escaped text | `surface.test.tsx` (chart exposes a `role="img"` with an accessible name stating the current actual `%`). No-markup is inherited: the chart label is React text/attribute content (escaped by default) composed from the CC's own name + numeric position — the same name string F1/F3 already pin as text-not-HTML; no new untrusted input enters. |
| Builder determinism + range/finite invariants | `trajectory.test.ts` (deep-equal CC ⇒ deep-equal `Trajectory`; all coordinates finite and in range across generated seeds and edited CCs) |

---

## Adversarial gate

Mode: independent clean-context gate (fresh `general-purpose` sub-agent, review-only). Ran once against the drafted spec and tests. The gate cleared the highest-risk areas explicitly: the feature is genuinely additive and read-only over the engine; `applyEdit` carries `actualCurve` through untouched (so the divergence story is real); the F2 "exactly four editable controls" survives because the new expand control is a `button`, not a `spinbutton`, and F2's only name-filtered button query targets "Regenerate"; the F1/F3 `querySelector('img')` injection assertions render `CandidateSurface` (which has no chart) so the new SVG `role="img"` cannot trip them; and the "not divergent on a fresh CC" claim holds because every generator archetype pins `actualCurve`'s last entry exactly equal to `actualCumulativeFraction`. The honest-chart divergence crux is pinned across multiple edit vectors, so a history-ignoring degenerate implementation cannot pass. Three findings, all coverage/integrity on `weeksElapsed` boundary behavior; all dispositioned **fixed**. No security, scope, or standards findings; none acknowledged (no rows added to constitution.md).

| # | Severity | Lens | Finding | Disposition |
|---|----------|------|---------|-------------|
| 1 | MEDIUM | Coverage (tests) | The single-observed-week edge case (`weeksElapsed = 1`) was named in the spec but never tested — the generator floors at 5 and tests only edited weeks *up*, so a renderer assuming ≥2 points for a polyline would throw and still pass. | **Fixed** — added `trajectory.test.ts` (`weeksElapsed` edited to 1 → single-point observed series, finite, no throw) and `surface.test.tsx` (a row's weeks edited down to 1 still renders its chart through the real renderer without `NaN`). |
| 2 | MEDIUM | Integrity / Failure modes (spec + tests) | `weeksElapsed` can be edited *down*, putting "now" behind recorded history; the spec's divergence prose said only "beyond," gave no rule for what is drawn, and no test exercised a downward edit. | **Fixed** — spec now defines the observed-actual series as **truncated to the current week** (`min(weeksElapsed, actualCurve.length)`) so no recorded "future" actual is plotted, and defines divergence to cover the short-of case (unchanged scalar ≠ truncated endpoint → dashed hypothetical). Added `trajectory.test.ts` cases: downward edit truncates the series and is divergent. |
| 3 | LOW | Coverage (tests) | US-4's no-`actualCurve` path was only unit-tested on the builder, never exercised through the rendered chart, leaving the renderer's empty/degenerate-series handling unverified at the component layer. | **Fixed** — the single-observed-week `surface.test.tsx` case added for #1 drives a degenerate observed series through the real renderer, covering the component-layer concern. |
