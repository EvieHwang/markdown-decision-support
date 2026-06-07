# Declaration — Explanation Depth & Buyer Vocabulary

*Feature 3 — normal mode (depth on a coherent slice).*

## What
Deepen the decision engine and explanation composer so each markdown candidate is
surfaced with a **named, plain-language reason** for *why* it's behind plan — not
just how far. Introduces a tight vocabulary of mutually-exclusive reason archetypes
(e.g. **never started**, **decelerating**, **seasonal cliff approaching**,
**inventory-depth urgency**), backed by a real per-CC weekly actual trajectory added
to the synthetic data. Ordering becomes urgency-aware: a compound severity lets a
time-critical or inventory-heavy CC outrank a merely larger raw gap.

## Why
The project's whole thesis is *legible, trustworthy* reasoning a buyer recognizes as
their own. The skeleton (F1) and interactive engine (F2) prove the gap math and live
recompute, but every candidate currently reads with one flat sentence — "N pts
behind, M wks left." That states the symptom, not the diagnosis. A buyer triages on
*why*: something that never sold differs from something that stalled, and a small gap
with two weeks of runway is more urgent than a big gap with two months. This feature
turns the computed signals into the buyer's vocabulary and orders by what actually
needs acting on first. It also pre-pays for #4, since the drill-down chart will want
the same actual trajectory.

## Success
- Every candidate row carries exactly one reason archetype from a fixed, small
  vocabulary, in buyer-legible language, while still stating the gap-in-points and
  weeks-remaining (F1/F2 frozen envelope preserved).
- The reasons are **trajectory-backed**: "decelerating" and "never started" are
  distinguished from a real weekly actual line, not asserted from a single point.
- Candidate ordering reflects urgency, not just raw gap — a smaller-gap CC near a
  seasonal cliff or sitting on deep inventory can rank above a larger-gap CC with
  runway.
- Fully deterministic and reproducible from the seed; the F1 `@frozen` pipeline and
  F2 recompute / severity-ordering tests continue to pass unchanged.

## Shape touched
- **Decision engine** — computes the new trajectory / cliff / inventory signals and a
  compound severity.
- **Explanation composer** — classifies the single most-relevant archetype and renders
  it in buyer vocabulary.
- **Synthetic data generator** — gains an optional weekly `actualCurve` per CC (ending
  at the existing `actualCumulativeFraction`), shaped so the archetypes are genuinely
  distinguishable.
- **Candidate surface** — displays the reason on each row (presentation only; no new
  view — that's #4).

## Out of scope
- The visual plan-vs-actual curve / per-CC drill-down (Roadmap #4).
- Empty / edge-state handling, on-screen thesis framing, and visual polish (Roadmap #5).
- Deploy (Roadmap #6).
- Any change to the frozen `Candidate` shape, the tier label↔percentage mapping, or the
  liquidation-floor cap.
- Open thresholds (archetype priority when several apply, exact cliff / inventory /
  never-started boundaries, the compound-severity formula) are named here but **pinned
  by `/spec`**, not this declaration.
