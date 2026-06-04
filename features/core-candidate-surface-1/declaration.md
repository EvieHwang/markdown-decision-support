# Feature Declaration — Core Candidate Surface

*Walking skeleton — first feature.*

## What
A single screen that, on load, generates one synthetic women's-shoes product class, runs the deterministic pipeline (compute plan-vs-actual gap → score severity → map to a markdown tier → compose a plain-language reason), and renders a ranked list of markdown candidates. Each row shows the CC, its suggested tier (First / Second / Clearance = 15 / 25 / 40%), and a one-sentence deterministic explanation of why it's a candidate. Read-only — the buyer looks at it, nothing is editable yet.

## Why
It's the spine. Every later feature (live editing, richer explanations, drill-down curves, deploy) iterates against this skeleton. It exists to prove the core thesis end-to-end: that a deterministic, purpose-fit engine can surface the right candidates with fully legible reasoning — no optimizer, no LLM. If the seams don't meet here, nothing downstream matters.

## Success
End-to-end reachability across every producing seam: load the page → synthetic data exists → engine flags the behind-trajectory CCs and scores them → each flagged CC gets a tier and a reason → the ranked list renders. Depth is deliberately shallow — a basic severity score, a basic ordering, a single explanation template — but the whole path is live and real (not mocked between stages).

- Candidates are ordered by severity (the engine scores severity; the list ranks by it). The scoring model and ordering stay basic — Roadmap #3 enriches both.
- Each flagged CC gets exactly one deterministic explanation shape ("behind plan by X, Y weeks left"). The branching vocabulary is Roadmap #3.
- Tests assert the pipeline produces correct flags and tiers for known synthetic inputs, and that the surface renders them.

## Shape touched
Synthetic data generator, Decision engine (plan vs. actual), Tier recommender, Explanation composer, Candidate surface.

*(All five producing seams. Input controls is the only Shape component deliberately untouched — that's Roadmap #2.)*

## Out of scope
- Inline editing / live recompute and the "regenerate sample" button (Roadmap #2). Data generates once on load; the seedable-regeneration control belongs to #2.
- Richer explanation vocabulary — decelerating vs. never-started, seasonal cliff approaching, inventory-depth urgency (Roadmap #3).
- Per-CC plan-vs-actual curve drill-down (Roadmap #4).
- Edge/empty states, on-screen thesis framing, visual design polish (Roadmap #5).
- GitHub Pages deploy (Roadmap #6).
