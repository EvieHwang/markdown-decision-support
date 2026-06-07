# Feature Declaration — Live Customization

*Roadmap #2. Builds directly on the walking skeleton (`core-candidate-surface-1`).*

## What
The screen becomes interactive. It now renders the **full** synthetic women's-shoes class — not just the behind-plan CCs: the severity-ranked markdown candidates stay the focal list, with the on/ahead-of-plan CCs present but visually de-emphasized. The buyer can inline-edit a CC's scalar inputs — **actual sell-through, price, liquidation floor, and weeks elapsed** — and the candidate list, tiers, and explanations recompute **live**: editing a healthy CC down can pull it into candidacy, and fixing a flagged one can drop it out. A visible, editable **seed** plus a **"regenerate sample"** control rebuilds the class deterministically (discarding any edits). Every edit is **clamped at the control**, so the generator's invariants always hold and the floor is never breached.

## Why
F1 proved the deterministic pipeline end-to-end, but read-only — a buyer could only look. This makes it *visibly a real engine*: the buyer manipulates inputs and watches the reasoning move, which is what earns the thesis ("a deterministic, purpose-fit instrument, not an optimizer black box") in front of a hiring manager. It also exercises the pipeline's recompute path from arbitrary edited inputs, not just generator-produced ones — the first time the engine runs on data it didn't make itself.

## Success
- The full class renders: candidates ranked by severity on top, non-candidates present and de-emphasized, every CC accounted for exactly once.
- Editing actual sell-through / price / floor / weeks-elapsed recomputes the affected CC's flag, severity, tier, explanation, and the list ordering — live, with no reload.
- Edits clamp at the control so invariants always hold (`actual ∈ [0,1]`, `0 < floor ≤ price×0.85`, `weeksElapsed ∈ [1, weeksTotal−1]`); the floor is never breached and the "no markdown headroom" case never arises.
- An unedited class recomputes to candidates **identical to F1's `buildCandidates(seed)`** for the same seed — the engine didn't change, only the entry path did.
- The seed is visible and editable; regenerate rebuilds deterministically and discards pending edits.

## Shape touched
Input controls (new), Synthetic data generator (reused), Decision engine (reused — recompute path), Candidate surface (extended: full class + interactive controls).

## Out of scope
- **Editing the plan curve** — it's a per-week array; curve manipulation belongs to the Roadmap #4 drill-down.
- **Editing inventory units** — the current engine's severity does not consume inventory, so an inventory control would recompute to *no visible change*. Deferred until Roadmap #3 (inventory-depth urgency) gives it an effect, rather than ship an inert control that undercuts the "real engine" point.
- Richer explanation vocabulary — decelerating vs. never-started, seasonal cliff, inventory-depth urgency (Roadmap #3).
- Per-CC plan-vs-actual curve drill-down (Roadmap #4).
- Designed empty/edge-state treatment, on-screen thesis framing, visual polish, full WCAG 2.1 AA audit (Roadmap #5).
- Per-field revert of a single edited CC — regenerate is the only reset.
- Persistence of edits or seed across reloads; GitHub Pages deploy (Roadmap #6).
