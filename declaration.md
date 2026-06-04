# Declaration

## What
Markdown Decision Support is a single-screen tool that does the legwork of spotting which retail items are behind plan and articulates why each is a markdown candidate. It compares actual sell-through against a plan curve, flags the color-colorways (CCs) behind trajectory, and surfaces each with a plain-language explanation and a suggested markdown tier (First / Second / Clearance at 15 / 25 / 40%). The decision stays with the buyer; the tool handles the pattern recognition and the articulation.

## Why
Retail buyers manage markdown timing by feel and spreadsheet. The decision is knowable — sell-through against a plan curve, with a liquidation floor as the terminal node — but surfacing the right candidates at the right moment is legwork most tools either skip or bury in optimization black boxes buyers don't trust. This tool removes the repetitive pattern-matching so the buyer's attention is reserved for the judgment that actually needs them. It also exists as a demonstration: that when the cost of building collapses, the right bet is a deterministic, purpose-fit instrument built for one decision — not an AI feature bolted onto a platform.

## For whom
The primary user is a retail buyer/planner managing markdown timing for a fashion product class — seasonal, sell-out goods rather than replenishment items. They need candidates surfaced in their own vocabulary, quickly, with the reasoning fully legible, not an optimizer's verdict to take on faith. A secondary audience is hiring managers evaluating the builder's product judgment and perspective on AI's role in product.

## Out of scope
No persistent database. No cadence or scheduling engine. No optimization model. No AI/LLM runtime features — explanations are deterministic, composed from the computed signals. No multi-user, authentication, or live data integration; data is synthetic and generated client-side. Not a platform — this serves one decision and stays out of the way of everything else.

## Platform
Web — a static, client-side single-page app. (Not an Apple platform, so the HIG-native adversarial lens doesn't apply.)

## Shape (revisable)
- **Synthetic data generator** — produces a realistic women's-shoes product class: a set of CCs, each with a plan curve, weekly actual sell-through, inventory on hand, price, liquidation floor, and weeks elapsed/remaining. Seedable so it can be regenerated.
- **Decision engine (plan vs. actual)** — the deterministic core: computes the sell-through gap against the plan curve, trajectory/pace, weeks of supply, and distance to the liquidation floor; flags which CCs are behind trajectory and scores severity.
- **Tier recommender** — maps the severity signals to a markdown tier (First / Second / Clearance = 15 / 25 / 40%), bounded by the liquidation floor.
- **Explanation composer** — deterministic, template-based: turns the computed signals into a plain-language sentence in the buyer's vocabulary. No LLM.
- **Candidate surface (the single screen)** — renders the ranked candidate list, each row with its explanation and suggested tier. The one thing the buyer looks at.
- **Input controls** — the customization seam: inline-edit a CC's inputs and recompute live, plus a "regenerate sample" button, so it's visibly a real engine.

## Roadmap (revisable)
1. **Core candidate surface (vertical slice)** — generate one synthetic women's-shoes class, run the decision engine, and render the ranked candidate list with deterministic explanations and suggested tiers. The thinnest end-to-end version that proves the thesis works. Touches: Synthetic data generator, Decision engine, Tier recommender, Explanation composer, Candidate surface.
2. **Live customization** — inline-edit a CC's inputs with live recompute, plus the "regenerate sample" button, so it's visibly a real engine. Touches: Input controls, Synthetic data generator, Decision engine, Candidate surface.
3. **Explanation depth & buyer vocabulary** — richer deterministic reasons (decelerating vs. never-started, seasonal cliff approaching, inventory-depth urgency) and severity-based ordering. Touches: Explanation composer, Decision engine, Candidate surface.
4. **Plan-vs-actual drill-down** — a per-CC view showing the curve visually, so the buyer sees the trajectory behind each flag. Legibility made concrete. Touches: Decision engine, Candidate surface.
5. **Demo presentation pass** — edge/empty states, an on-screen framing of the thesis ("how this works"), and a visual design polish. Touches: Candidate surface.
6. **Shareable static deploy** — build and publish to GitHub Pages so it's a link you can hand to a hiring manager. Touches: Candidate surface.
