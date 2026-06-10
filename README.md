# Markdown Decision Support

A single-screen tool that surfaces retail markdown candidates by comparing sell-through against a plan curve, explaining each in plain language and suggesting a markdown tier.

**Live demo:** https://eviehwang.github.io/markdown-decision-support/

## What it does

Retail buyers manage markdown timing by feel and spreadsheet. The decision is knowable — actual sell-through against a plan curve, with a liquidation floor as the terminal constraint — but most tools either skip the legwork or bury it in optimization black boxes buyers don't trust.

This tool does the pattern recognition and leaves the judgment with the buyer:

- **Compares plan vs. actual** sell-through for each color-colorway (CC) in a product class and flags the ones behind trajectory.
- **Explains each flag in plain language** — deterministic, template-based explanations composed from the computed signals, in the buyer's own vocabulary. No LLM at runtime.
- **Suggests a markdown tier** — First / Second / Clearance (15 / 25 / 40%), bounded by the liquidation floor.
- **Recomputes live** — edit any CC's inputs inline or regenerate the sample data to see it's a real engine, not a mockup.

Data is synthetic (a realistic women's-shoes product class), generated client-side and seedable. There's no backend, no database, and no login — the whole thing is a static page.

## Why it exists

Beyond the decision itself, this project is a demonstration: when the cost of building collapses, the right bet is a deterministic, purpose-fit instrument built for one decision — not an AI feature bolted onto a platform.

## Running locally

Requires [pnpm](https://pnpm.io/).

```sh
pnpm install   # install dependencies
pnpm dev       # start the Vite dev server at http://localhost:5173
pnpm test      # run the Vitest suite
pnpm build     # produce a static bundle in dist/
```

Built with React, TypeScript, Vite, and Tailwind CSS. The build is fully static and deploys to GitHub Pages.

## How it's organized

| Path | What it is |
|---|---|
| `src/data.ts` | Synthetic data generator (seedable product class) |
| `src/engine.ts`, `src/trajectory.ts`, `src/health.ts` | Decision engine: sell-through gap, pace, weeks of supply, distance to liquidation floor |
| `src/tier.ts` | Tier recommender (First / Second / Clearance) |
| `src/explanation.ts` | Deterministic explanation composer |
| `src/components/` | The candidate surface — ranked list, per-CC drill-down, inline editing |
| `declaration.md` | What this project is and why |
| `constitution.md` | Principles, standards, and project conventions |
| `features/` | Per-feature specs, declarations, and test artifacts |

## Out of scope

No persistent database, no scheduling engine, no optimization model, no runtime AI/LLM features, no multi-user or live data integration. This serves one decision and stays out of the way of everything else.
