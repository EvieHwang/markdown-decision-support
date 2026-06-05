# Spec — Core Candidate Surface

*Walking skeleton — first feature. Declaration: `features/core-candidate-surface-1/declaration.md`.*

The deterministic spine: generate one synthetic women's-shoes product class, run it through the decision pipeline, and render a ranked list of markdown candidates with a suggested tier and a plain-language reason. Read-only.

---

## Behavioral requirements

### Domain vocabulary
- **CC** — a color-colorway: one sellable variant of a women's-shoes style (e.g. "Aria Pump — Black").
- **Plan curve** — the cumulative planned sell-through fraction for each week of the season, non-decreasing, ending at ≈1.0 by season end.
- **Sell-through gap** — at the current week, `planned cumulative fraction − actual cumulative fraction`. Positive = behind plan. Expressed to the buyer in **points**: `gapPoints = round(gap × 100)`, an integer (e.g. a gap of `0.18` is `18` points). The explanation sentence is formatted from this same integer, so the displayed value and `gapPoints` always agree.
- **Markdown tier** — one of exactly three: **First (15% off)**, **Second (25% off)**, **Clearance (40% off)**.
- **Liquidation floor** — the lowest acceptable price for a CC. A recommended tier's discounted price must never fall below it.

### User stories

**US-1 — Surfaced candidates on load.**
As a buyer, when I open the screen, I see a ranked list of the CCs that are behind plan, without doing anything.
- *Acceptance:* On load, a synthetic product class is generated, evaluated, and the behind-plan CCs render as a list. CCs that are on or ahead of plan do not appear.

**US-2 — A suggested tier per candidate.**
As a buyer, each candidate shows a suggested markdown tier so I have a starting point for the decision.
- *Acceptance:* Every rendered candidate shows exactly one tier — First, Second, or Clearance — with its percentage (15 / 25 / 40). The recommended tier's discounted price is never below that CC's liquidation floor.

**US-3 — A legible reason per candidate.**
As a buyer, each candidate shows a plain-language sentence explaining why it's a candidate, in my vocabulary, with no optimizer verdict to take on faith.
- *Acceptance:* Every rendered candidate shows a non-empty explanation that references how far behind plan it is and how many weeks remain. The reasoning is composed deterministically from the computed signals (no LLM, no randomness).

**US-4 — Ranked by urgency.**
As a buyer, the most urgent candidates are at the top so my attention goes there first.
- *Acceptance:* The candidate list is ordered by severity, most severe first.

**US-5 — Reproducible engine.**
As a buyer (and as a test), the same inputs always produce the same candidates, tiers, and explanations — it's an engine, not a guess.
- *Acceptance:* Generating and evaluating with the same seed produces an identical candidate list every time.

### Edge cases and failure modes
- **No candidates behind plan.** The pipeline returns an empty list and the surface renders zero rows without error. *(A designed/empty-state treatment is Roadmap #5; the skeleton must not crash.)*
- **CC exactly on plan (gap = 0) or ahead (gap < 0).** Never flagged, never rendered.
- **Floor binds.** When severity indicates a deeper tier than the floor allows, the recommendation is capped to the deepest tier whose discounted price stays at or above the floor. At least First is always available because the generator guarantees `floor ≤ price × 0.85` (see design). A CC with no markdown headroom at all (`floor > price × 0.85`) is **out of scope** for this feature — the generator never produces one.
- **Untrusted-looking text in data.** CC names and explanations are rendered as text, not HTML, so any markup-like characters appear literally and cannot inject markup.

### Out of scope (this feature)
- Inline editing / live recompute and the "regenerate sample" control (Roadmap #2). Data generates once on load.
- Richer engine signals (pace/trajectory, weeks-of-supply) and richer explanation vocabulary — decelerating vs. never-started, seasonal cliff, inventory-depth urgency (Roadmap #3). Severity here is a basic function of the sell-through gap.
- Per-CC plan-vs-actual curve drill-down (Roadmap #4).
- Designed empty/edge-state treatment, on-screen thesis framing, visual polish, full WCAG 2.1 AA audit (Roadmap #5 / pre-launch).
- The "no markdown headroom" CC case (`floor > price × 0.85`).
- GitHub Pages deploy (Roadmap #6).

---

## Design

A linear, deterministic pipeline of pure functions feeding one read-only React surface. No backend, no persistence, no network. The whole feature is client-side.

### Seams

The seams below are named so tests can observe behavior. Module/function names and field names are the provisional surface `/build` implements against; the **behavioral properties** are the contract. The most stable, externally-observable seam is the pipeline output (`buildCandidates`) and the rendered surface — frozen behaviors live there; the per-stage functions carry latitude.

**1. Synthetic data generator** — `generateProductClass(seed) → CC[]`
- Deterministic in `seed`: same seed ⇒ deep-equal output.
- Produces a women's-shoes class of multiple CCs (≥ 8).
- Each CC carries at least: `id`, `name`, `price > 0`, `liquidationFloor`, `weeksTotal`, `weeksElapsed`, `weeksRemaining`, `inventoryUnits ≥ 0`, `planCurve` (cumulative planned fraction per week), and the actual cumulative sell-through fraction at the current week.
- Invariants the generator guarantees:
  - `0 < liquidationFloor ≤ price × 0.85` (at least the First tier always respects the floor).
  - `planCurve` is non-decreasing and ends at ≈ 1.0 (`±0.001`).
  - `0 ≤ actual cumulative fraction ≤ 1`.
  - `weeksElapsed ≥ 1`, `weeksRemaining ≥ 1`, `weeksElapsed + weeksRemaining = weeksTotal`.
  - At least one CC is behind plan (so the skeleton always has something to show).

**2. Decision engine** — `evaluate(cc) → { gap, severity, flagged, weeksRemaining }`
- `gap = plannedCumulativeFractionNow − actualCumulativeFractionNow`.
- `flagged = gap > FLAG_THRESHOLD`. (`FLAG_THRESHOLD` is a design choice; the contract is that a CC on or ahead of plan, `gap ≤ 0`, is never flagged.)
- `severity` is a non-decreasing function of `gap` (basic: `severity = max(gap, 0)`). Increasing a CC's gap, all else equal, never decreases its severity.

**3. Tier recommender** — `recommendTier({ severity, price, liquidationFloor }) → { tier, discountPct, discountedPrice }`
- `tier ∈ {First, Second, Clearance}` with the fixed correspondence `First→15`, `Second→25`, `Clearance→40` (from the declaration; not adjustable).
- Severity selects a base tier (deeper severity ⇒ deeper base tier; the exact thresholds are a design choice).
- **Floor cap:** the recommendation is the deepest tier *at or shallower than the base tier* whose `discountedPrice = price × (1 − discountPct/100) ≥ liquidationFloor`. Within the generator's guaranteed domain (`floor ≤ price × 0.85`) at least First always qualifies.
- Monotonic: with `price` and `liquidationFloor` fixed, increasing severity never returns a shallower tier.

**4. Explanation composer** — `composeExplanation(cc, evaluation, recommendation) → string`
- Returns one deterministic, non-empty sentence in buyer vocabulary, referencing the sell-through gap (in points) and weeks remaining, and naming the suggested tier. One template only (branching vocabulary is Roadmap #3).

**5. Pipeline** — `buildCandidates(seed) → Candidate[]`
- Composes generator → engine → recommender → composer, keeps only flagged CCs, and returns them sorted by `severity` descending.
- `Candidate` exposes at least: `id`, `name`, `price`, `liquidationFloor`, `severity`, `weeksRemaining`, `gapPoints` (integer points, `round(gap × 100)`), `tier`, `discountPct`, `discountedPrice`, `explanation`.
- Deterministic in `seed`. Floor invariant holds for every element: `discountedPrice ≥ liquidationFloor`.

**6. Candidate surface** — a read-only React component rendering a `Candidate[]`
- Renders one row per candidate, preserving the given order, each row showing the CC name, the tier label with its percentage, and the explanation.
- Renders zero rows without error when given an empty list.
- Renders candidate text as text content (not raw HTML); markup-like characters in a name or explanation appear literally.
- Uses semantic structure: a heading for the surface and a list/table whose items map one-to-one to candidates (each row is a real list item or table row, exposed with the corresponding ARIA role — not a bare `<div>`), with keyboard-reachable markup. Full WCAG 2.1 AA audit is deferred (see Out of scope).

### Constraints summary (behavioral)
- **Determinism:** same seed ⇒ identical candidate list. *(US-5)*
- **Floor never breached:** every recommended `discountedPrice ≥ liquidationFloor`. *(US-2, edge: floor binds)*
- **Tier set fixed:** exactly {First 15, Second 25, Clearance 40}, with the fixed label↔pct correspondence. *(US-2)*
- **Flag correctness:** `gap ≤ 0` ⇒ never a candidate; sufficiently behind ⇒ candidate. *(US-1)*
- **Ordering:** candidates sorted by severity descending. *(US-4)*
- **Explanation:** non-empty, references gap and weeks remaining, deterministic. *(US-3)*
- **No-HTML rendering:** candidate text is rendered as text, not interpreted as markup. *(edge: untrusted-looking text)*

### Standards notes
- **OWASP Top 10:** No backend, no auth, no persistence, no network calls — most items are not applicable. The one live client-side surface is injection (A03): addressed by the no-HTML-rendering constraint.
- **WCAG 2.1 AA:** Structural accessibility (semantic elements, headings, keyboard reachability) is in scope now because it is expensive to retrofit; a full AA audit (contrast, complete ARIA) is deferred to the pre-launch polish pass (Roadmap #5). Owner decision, this feature.
- **OpenAPI / Apple HIG:** Not applicable (no API; web platform, per declaration `## Platform`).

### Pattern reuse
None. This is the project's first feature; there is no existing module or pattern in `constitution.md`'s registry to reuse.

---

## Coverage

| Requirement / seam | Verified by |
|---|---|
| US-1 surfaced on load; flagged-only | `pipeline.test.ts` (flagged-only, generated data), `surface.test.tsx` (renders rows) |
| US-2 one tier per candidate; floor respected | `pipeline.test.ts` (floor invariant, tier set), `tier.test.ts` (floor cap), `surface.test.tsx` (tier label+pct shown) |
| US-3 legible deterministic explanation | `pipeline.test.ts` (non-empty, phrase-anchored gap-in-points + weeks; `gapPoints` integer), `surface.test.tsx` (explanation shown) |
| US-4 ranked by severity desc | `pipeline.test.ts` (ordering) |
| US-5 reproducible / deterministic | `pipeline.test.ts` (same seed ⇒ equal), `generator.test.ts` (determinism) |
| Generator invariants | `generator.test.ts` (floor ≤ price×0.85, plan curve monotonic + ends ≈1, weeks, ≥1 behind) |
| Engine: gap, flag, severity monotonicity | `engine.test.ts` |
| Tier: severity→tier, floor cap, monotonicity | `tier.test.ts` |
| Edge: empty list renders, no crash | `surface.test.tsx` (empty list) |
| Edge: on/ahead of plan not flagged | `engine.test.ts`, `pipeline.test.ts` |
| Seam #6 semantic structure (heading + list/table rows) | `surface.test.tsx` (heading + semantic rows) |
| No-HTML rendering (injection via name and explanation) | `surface.test.tsx` (name path, explanation path) |

---

## Adversarial gate

Mode: independent clean-context gate (fresh sub-agent, review-only). Ran once against the drafted spec and tests. Four findings, all dispositioned **fixed** — none acknowledged, so no rows were added to `constitution.md`'s Acknowledged risks. The one security finding was LOW, so no security re-gate was triggered.

| # | Severity | Lens | Finding | Disposition |
|---|---|---|---|---|
| 1 | HIGH | Integrity (tests/spec) | Frozen pipeline test coupled the explanation to `String(gapPoints)` with `gapPoints` undefined in the spec — a build computing `gap×100` yields floats (`19.999…`), forcing a broken build or a lossy value in the shared `Candidate` shape. | **Fixed** — spec now defines `gapPoints = round(gap×100)` (integer points), formatted into the same sentence; the test asserts `gapPoints` is integer and phrase-anchors the explanation. |
| 2 | MEDIUM | Coverage/standards | Structural accessibility (seam #6) was stated in-scope but had zero tests; div-soup would pass. | **Fixed** — spec tightened seam #6 to require a heading + list/table rows with ARIA roles; added a `surface.test.tsx` test asserting a heading and semantic rows. |
| 3 | LOW | Security/coverage | Injection test routed markup only through `name`; a `dangerouslySetInnerHTML` explanation path would go uncaught. | **Fixed** — added a `surface.test.tsx` test routing markup through `explanation`. |
| 4 | LOW | Tests | `toContain(String(n))` assertions could pass on coincidental digit overlap. | **Fixed** — replaced with phrase-anchored regex assertions (`N pts`, `N wks`). |
