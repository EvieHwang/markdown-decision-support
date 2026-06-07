# Spec — Explanation Depth & Buyer Vocabulary

*Roadmap #3. Declaration: `features/explanation-depth-3/declaration.md`. Builds on the frozen seams of `core-candidate-surface-1` (the `Candidate` shape, `evaluate`, `recommendTier`, `composeExplanation`, `generateProductClass`, `buildCandidates`) and `live-customization-2` (`applyEdit`, `evaluateClass`, the interactive surface).*

Turn the engine's flat verdict into a diagnosis. Today every candidate reads "N pts behind, M wks left." This feature backs each candidate with a **real weekly actual trajectory**, classifies it into one of a small, named **reason vocabulary** (never started / decelerating / seasonal cliff / inventory-depth, with a plain "behind plan" baseline), renders that reason in the buyer's language, and makes candidate **ordering urgency-aware** via a compound severity — so a smaller-gap CC that is out of runway or sitting on deep stock can outrank a larger-gap CC with time to recover. Deterministic throughout; no LLM.

The two product decisions that shaped this spec (owner, during `/spec`):
- **Urgency affects ranking only, not the discount tier.** The recommended tier stays a function of the sell-through gap magnitude exactly as in F1; urgency (cliff/inventory) re-orders candidates but never deepens a markdown. This keeps a small-but-late gap from being recommended a disproportionate 40%-off, preserving the tool's legibility.
- **One reason per candidate, urgency-first priority** when several archetypes apply: `seasonal-cliff > inventory-depth > decelerating > never-started > behind-plan(baseline)`.

---

## Behavioral requirements

### Domain vocabulary (delta from F1/F2)
- **Actual curve** (`actualCurve`) — the *observed* weekly cumulative actual sell-through to date: one entry per elapsed week (`length === weeksElapsed`), non-decreasing, with its **last** entry equal to the CC's `actualCumulativeFraction` (the current cumulative actual the engine already reads). It covers only weeks that have happened — there are no actuals for the future. It is the trajectory the engine reads to tell *why* a CC is behind. New, optional field on `CC`; the generator always emits it, hand-built fixtures may omit it.
- **Reason archetype** — the single named diagnosis attached to a candidate, one of:
  - **never-started** — behind plan from early in the season; the actual curve lagged plan beyond the flag threshold already at an early checkpoint.
  - **decelerating** — tracked plan acceptably early (within the flag threshold at the early checkpoint) but fell behind later; the gap opened recently.
  - **seasonal-cliff** — few weeks remain to clear the shortfall (`weeksRemaining` at or below the cliff threshold).
  - **inventory-depth** — heavy unsold stock relative to the weeks left to move it (units-per-remaining-week at or above the depth threshold).
  - **behind-plan** — the baseline: behind plan, but with no acute trajectory or urgency story. Always available so every candidate has a reason.
- **Compound severity** — the candidate ordering key. A non-decreasing function of the sell-through gap magnitude, amplified by cliff proximity and inventory depth. Replaces F1's `severity = max(gap, 0)` *as the ordering field*; it does **not** feed the tier.
- **Tier magnitude** — `max(gap, 0)` (F1's old severity). The value the tier recommender consumes, kept separate from compound severity so the discount tier stays gap-driven.

### User stories

**US-1 — A named reason per candidate.**
As a buyer, each candidate tells me *why* it's behind in my own words — not just how far — so I can triage on cause, not just magnitude.
- *Acceptance:* Every candidate carries exactly one reason archetype from the fixed vocabulary, and its explanation sentence renders that reason in buyer language while still stating the gap-in-points and weeks-remaining. Composed deterministically from the computed signals (no LLM, no randomness).

**US-2 — Trajectory-backed diagnosis.**
As a buyer, "decelerating" and "never started" are real reads of the sell-through path, not guesses, so I trust them.
- *Acceptance:* The two trajectory archetypes are determined from the CC's actual curve against its plan curve: a CC behind plan at the early checkpoint classifies never-started; a CC on-track early but behind now classifies decelerating. With no actual curve available, neither trajectory archetype is selected (the classifier falls through to an urgency archetype or the baseline) — it never throws.

**US-3 — Urgency-aware ranking.**
As a buyer, the candidate that most needs acting on is at the top, even when its raw gap is smaller, so my attention goes to what's time-critical.
- *Acceptance:* Candidates are ordered by compound severity, most severe first. A CC with a smaller sell-through gap but a nearer seasonal cliff and/or deeper inventory can rank above a CC with a larger gap and neither pressure. Compound severity is finite for every candidate and non-decreasing in the gap when the other signals are held fixed.

**US-4 — Tier unchanged by urgency.**
As a buyer, the recommended markdown depth still reflects how far behind on sell-through the CC is — urgency moves it up my list but doesn't talk me into a deeper cut than the gap warrants.
- *Acceptance:* For two CCs with identical gap, price, and floor, the recommended tier is identical regardless of their weeks-remaining or inventory. The tier remains the floor-capped, gap-driven recommendation F1 froze; for any seed, the tier on each candidate is exactly what F1 produced.

**US-5 — One reason, deterministic priority.**
As a buyer, when more than one story is true I see the most decision-relevant one, chosen the same way every time.
- *Acceptance:* When several archetypes apply to one CC, the selected reason follows the fixed priority `seasonal-cliff > inventory-depth > decelerating > never-started > behind-plan`. Same CC ⇒ same archetype, every time.

**US-6 — Engine still in lockstep.**
As a buyer (and as a test), the richer engine didn't break the verdicts: an unedited generated class still yields the same candidate membership and tiers, and the screen still recomputes live.
- *Acceptance:* For any seed, `evaluateClass(generateProductClass(seed)).candidates` deep-equals `buildCandidates(seed)`; candidate membership (which CCs are flagged) and every candidate's tier, discount, and gap-points are unchanged from F1. The interactive surface continues to render and recompute as in F2, now showing each candidate's reason.

### Edge cases and failure modes
- **No actual curve on a CC.** A hand-built or legacy CC without `actualCurve`: the classifier cannot read a trajectory, so never-started/decelerating are unavailable; it classifies an urgency archetype if one applies, else the baseline. No throw, no NaN.
- **Several archetypes at once.** Resolved by the fixed priority (US-5). never-started and decelerating are mutually exclusive by construction (early-checkpoint gap is either over or under threshold), so at most one trajectory archetype is ever a candidate for the slot.
- **A behind-plan CC with no acute story.** Behind beyond the flag threshold but with comfortable weeks remaining, ordinary inventory, and (if present) an early-tracking-then-mildly-behind curve that doesn't meet the decelerating bar: classifies the **behind-plan** baseline. Every candidate always has a reason.
- **Edit changes the current position but not history.** Editing `actualCumulativeFraction` (F2) changes the current gap; the actual curve (the early trajectory) is carried through unchanged by `applyEdit`. A still-behind edited CC keeps a trajectory read consistent with its original early path; a CC edited to on/ahead of plan drops out of candidacy and shows no reason. No edit produces a non-finite value or an inconsistent partition.
- **Boundary weeks/inventory.** A CC exactly at the cliff threshold counts as seasonal-cliff; exactly at the inventory depth threshold counts as inventory-depth. Thresholds are inclusive design constants (see Design); tests assert the *behavior* either side of the boundary, not the constant.
- **Untrusted-looking text.** Reasons are composed from the deterministic vocabulary and rendered as text, not HTML (inherited from F1). No new untrusted input enters; the four editable controls remain numeric and clamped (F2). Inventory remains **non-editable** (F2 froze exactly four editable controls).

### Out of scope (this feature)
- Making inventory (or the plan/actual curves) editable — F2 froze exactly four editable controls; this feature reads inventory and the actual curve but adds no control.
- The visual plan-vs-actual curve / per-CC drill-down (Roadmap #4) — the `actualCurve` added here is the data that feature will chart, but no chart is built now.
- Multiple reasons or combined-reason phrasing on one candidate (one reason per candidate, by decision).
- Letting urgency deepen the discount tier (explicitly decided against).
- Designed empty/edge-state treatment, on-screen thesis framing, visual polish, full WCAG 2.1 AA audit (Roadmap #5).
- Any change to the frozen `Candidate` field semantics other than the additive `reason`, the tier label↔percentage mapping, or the floor cap.

---

## Design

Additive enrichment over the F1/F2 pipeline: the generator gains a trajectory, the engine gains urgency signals and a compound ordering severity, a reason classifier picks one archetype, and the explanation composer speaks it. The tier recommender, the flag rule, the clamp, the partition, and the surfaces are otherwise reused unchanged. Still fully client-side: no backend, no persistence, no network.

### Seams

Module/function names and field names are the provisional surface `/build` implements against; the **behavioral properties** are the contract. The stable, externally-observable seams are the pipeline/recompute output (`buildCandidates` / `evaluateClass`), the reason on each candidate, and the rendered surface.

**1. Synthetic data generator (enriched)** — `generateProductClass(seed) → CC[]`
- Unchanged guarantees from F1 hold (determinism, ≥8 CCs, floor ≤ price×0.85, plan curve non-decreasing ending ≈1.0, coherent weeks, ≥1 behind).
- **New:** each CC carries `actualCurve: number[]`, the observed cumulative actual sell-through to date, with:
  - non-decreasing values in `[0, 1]`, one entry per elapsed week (`length === weeksElapsed`) — observed weeks only, no future actuals;
  - its **last** entry equal to `actualCumulativeFraction` (the scalar the engine already reads "now"), so the curve and the scalar never contradict each other;
  - shape that makes the trajectory archetypes real: among the behind-plan CCs the class contains **both** trajectory shapes — at least one CC that was already behind plan (beyond the flag threshold) at the early checkpoint (*never-started shape*) and at least one that was on-track early (within the threshold) but behind now (*decelerating shape*).
- Determinism is preserved: same seed ⇒ deep-equal output (curve included). Changing the generator's internal draw sequence to produce the curve is acceptable — no contract pins absolute per-seed values, only the F1↔F2↔F3 lockstep, which holds because all paths share this generator.

**2. Decision engine (enriched)** — `evaluate(cc) → { gap, severity, flagged, weeksRemaining, … }`
- `gap` and `flagged` are **unchanged**: `gap = plannedNow − actualNow`, `flagged = gap > FLAG_THRESHOLD`. Candidate membership does not move.
- The **tier magnitude** `max(gap, 0)` is exposed/available to the pipeline for the tier recommendation (this is F1's old `severity` value, preserved so the tier stays gap-driven).
- `severity` is now the **compound ordering score**: a non-decreasing function of the tier magnitude, amplified by (a) cliff proximity — larger as `weeksRemaining` falls to/below the cliff threshold — and (b) inventory depth — larger as units-per-remaining-week rises. Properties:
  - finite for all inputs (no `NaN`/`Infinity`), and `≥ 0`;
  - non-decreasing in the gap with `weeksRemaining` and inventory held fixed (so F1's engine monotonicity still holds);
  - able to invert a raw-gap ordering: a CC with a smaller gap but cliff and/or inventory pressure can exceed the severity of a larger-gap CC with neither.
- The exact amplification formula is a design choice; tests assert the three properties above, not the formula's constants.

**3. Reason classifier** — `classifyReason(cc) → ReasonArchetype` *(archetype ∈ {`seasonal-cliff`, `inventory-depth`, `decelerating`, `never-started`, `behind-plan`})*
- Pure and deterministic in the CC.
- Selects the single archetype by the fixed **urgency-first priority** `seasonal-cliff > inventory-depth > decelerating > never-started > behind-plan`: the first whose condition the CC meets.
  - `seasonal-cliff` when `weeksRemaining ≤ CLIFF_WEEKS`.
  - `inventory-depth` when `inventoryUnits / weeksRemaining ≥ INVENTORY_PRESSURE`.
  - `decelerating` when an `actualCurve` is present, the CC was within the flag threshold of plan at the early checkpoint, and is behind now.
  - `never-started` when an `actualCurve` is present and the CC was already behind plan beyond the flag threshold at the early checkpoint.
  - `behind-plan` otherwise.
- `CLIFF_WEEKS`, `INVENTORY_PRESSURE`, and the early checkpoint are design constants; tests assert classification behavior on either side of each boundary and the priority ordering, not the constants.
- Robust: a CC without `actualCurve` simply cannot match the two trajectory archetypes; the classifier still returns a valid archetype (urgency or baseline) and never throws.

**4. Explanation composer (enriched)** — `composeExplanation(cc, evaluation, recommendation) → string`
- Selects the archetype (via the classifier) and renders one deterministic, non-empty, plain-language sentence for it in the buyer's vocabulary.
- **Frozen facts preserved:** the sentence still states the gap in points (`<gapPoints> pts`) and the weeks remaining (`<weeksRemaining> wks`), satisfying the F1/F2 explanation regexes, and names the suggested tier.
- Distinct archetypes yield distinguishable sentences (a never-started candidate does not read identically to a seasonal-cliff one).
- No LLM, no randomness. Rendered as text downstream (no HTML).

**5. Pipeline / recompute (reused, reason added)** — `buildCandidates(seed)` / `evaluateClass(ccs)`
- Compose generator → engine → classifier → recommender → composer as before, keep only flagged CCs, sort by **compound `severity`** descending.
- The tier recommendation is computed from the **tier magnitude** (`max(gap,0)`), not compound severity — so tiers are identical to F1 for every seed.
- `Candidate` gains an **optional `reason: ReasonArchetype`** field, always populated on pipeline/recompute output (every candidate has a reason). The field is optional in the type only so existing hand-built fixtures still type-check; pipeline output always sets it.
- F1↔F2↔F3 lockstep holds: `evaluateClass(generateProductClass(seed)).candidates` deep-equals `buildCandidates(seed)` (both compose the same enriched code), and candidate membership/tier/discount/gapPoints match F1.
- Determinism, the total/disjoint partition, the floor invariant, and "no non-finite output" (F2) all still hold, reason and compound severity included.

**6. Candidate surface (reused)** — the F1/F2 React surfaces
- Each candidate row already renders its `explanation`; the reason now lives in that sentence, so it reaches the screen through the existing rendering with no structural change. The optional `reason` field is available to the surface should `/build` choose to badge it, but no new control, view, or layout is in scope.
- Text-not-HTML rendering and the F2 four-editable-controls contract are unchanged. Inventory stays non-editable.

### Constraints summary (behavioral)
- **One reason per candidate, from the fixed vocabulary, deterministic.** *(US-1, US-5)*
- **Trajectory archetypes read the actual curve; absent it, they're unavailable and nothing throws.** *(US-2, edge: no curve)*
- **Ordering by compound severity; smaller-gap-but-urgent can outrank larger-gap; severity finite and gap-monotonic with other signals fixed.** *(US-3)*
- **Tier is gap-driven and urgency-invariant; identical to F1 per seed.** *(US-4, US-6)*
- **Priority `seasonal-cliff > inventory-depth > decelerating > never-started > behind-plan`.** *(US-5)*
- **Explanation still states `<gapPoints> pts` and `<weeksRemaining> wks` and names the tier; archetypes phrase distinctly.** *(US-1, inherited frozen regexes)*
- **F1↔F2↔F3 lockstep, total partition, floor never breached, no non-finite output — all preserved.** *(US-6, inherited)*
- **Generator emits a consistent, non-decreasing `actualCurve` and includes both trajectory shapes among behind-plan CCs.** *(US-2)*

### Standards notes
- **OWASP Top 10:** Still no backend/auth/persistence/network. No new input surface — inventory and curves are not editable; the four numeric controls and the text-not-HTML rendering are inherited from F1/F2. Injection posture (A03) unchanged.
- **WCAG 2.1 AA:** No new controls or views; the reason renders inside the existing semantic candidate row. Structural accessibility is inherited; full AA audit stays deferred (Roadmap #5).
- **OpenAPI / Apple HIG:** Not applicable (no API; web platform per declaration `## Platform`).

### Pattern reuse
- **Reuses, unchanged:** `recommendTier` (tier recommender — fed the gap magnitude exactly as F1), `applyEdit` (clamp — carries the new `actualCurve` through by its existing spread), `evaluateClass`'s partition/determinism contract, and both rendered surfaces. The F1↔F3 tier-equality and the F1↔F2↔F3 lockstep are the executable guards that this reuse is genuine.
- **Enriched, not reimplemented:** `generateProductClass`, `evaluate`, `composeExplanation` gain behavior but keep their externally-observable F1 contracts.
- **New:** the reason classifier (`classifyReason`) and the `reason` field on `Candidate`.

---

## Coverage

| Requirement / seam | Verified by |
|---|---|
| US-1 one named reason per candidate; explanation renders it + frozen facts | `reason.test.ts` (every candidate has a valid archetype; composer output non-empty, archetype-distinct, states gap-pts + weeks), `surface.test.tsx` (distinct reasons reach the screen) |
| US-2 trajectory archetypes read the actual curve; absent-curve fallback no-throw | `reason.test.ts` (never-started vs decelerating from controlled curves; no-curve falls through without throwing) |
| US-3 urgency-aware ordering; severity finite + gap-monotonic; smaller-gap-urgent outranks | `severity.test.ts` (compound severity monotonic in gap with signals fixed; cliff/inventory raise severity; smaller-gap+urgency ranks above larger-gap; finite) |
| US-4 tier gap-driven and urgency-invariant; identical to F1 per seed | `severity.test.ts` (same gap/price/floor ⇒ same tier regardless of weeks/inventory), `lockstep.test.ts` (per-seed tier/discount/gapPoints equal F1) |
| US-5 one reason, fixed urgency-first priority, deterministic | `reason.test.ts` (cliff beats decelerating; inventory beats never-started; baseline when none; same CC ⇒ same archetype) |
| US-6 F1↔F2↔F3 lockstep; membership unchanged; live recompute intact | `lockstep.test.ts` (`evaluateClass(generateProductClass(seed)).candidates` deep-equals `buildCandidates(seed)`; membership + tiers match F1), `surface.test.tsx` (renders + recomputes) |
| Generator emits consistent non-decreasing actualCurve; both trajectory shapes present | `generator.test.ts` (length, monotonic, endpoint-consistent with `actualCumulativeFraction`; ≥1 never-started-shape and ≥1 decelerating-shape among behind CCs; determinism) |
| Edit carries the actual curve through unchanged; still no non-finite | `severity.test.ts` (applyEdit preserves `actualCurve`; recompute stays finite) |
| Edge: behind-plan baseline when no acute story | `reason.test.ts` (baseline case) |

---

## Adversarial gate

Mode: independent clean-context gate (fresh `general-purpose` sub-agent, review-only). Ran once against the drafted spec and tests. The gate explicitly cleared the highest-risk areas: the frozen F1/F2 contracts are safe — `severity` becoming compound does not reach the tier (the pipeline feeds `recommendTier` the gap magnitude, guarded by the per-seed tier-equality and lockstep tests), the F2 "exactly four editable controls" is untouched (no control added), and the compound-severity property tests genuinely exclude a degenerate `severity = max(gap,0)`. Three findings; all dispositioned **fixed**. None acknowledged (no rows added to `constitution.md`'s Acknowledged risks); no security findings (no security re-gate).

| # | Severity | Lens | Finding | Disposition |
|---|----------|------|---------|-------------|
| 1 | HIGH | Integrity (spec vs. tests) | Design seam #1 said `actualCurve` has `length === weeksTotal` with "now" at an interior index, but the vocabulary, every fixture, and `generator.test.ts` treat it as observed-weeks-only (`length === weeksElapsed`, last entry = `actualCumulativeFraction`). The two halves of the spec could not both be satisfied — a build following the prose fails the generator tests; one following the tests contradicts the prose. | **Fixed** — corrected the vocabulary line and seam #1 to `length === weeksElapsed`, observed weeks only, last entry = `actualCumulativeFraction` (the tests' intended design). |
| 2 | MEDIUM | Coverage (tests) | never-started vs. decelerating was pinned only at extreme curves (behind at every week vs. exactly on plan); a classifier reading the wrong week index or the latest-observed gap could still pass, leaving the real early-checkpoint split unverified. | **Fixed** — added a near-boundary pair to `reason.test.ts`: early gap consistently ~0.07 (just over the flag threshold → never-started) vs. ~0.03 (just under → decelerating) across the whole early span, robust to wherever the early checkpoint sits in the first two-thirds. |
| 3 | LOW | Coverage (tests) | `composeExplanation` distinctness was asserted for only one archetype pair; two reasons (e.g. inventory-depth and behind-plan) could silently render identical sentences, defeating US-1. | **Fixed** — `reason.test.ts` now asserts all five archetypes produce five distinct sentences, with inventory-depth and behind-plan deliberately sharing gap-points/weeks so only the archetype phrasing can distinguish them. |
