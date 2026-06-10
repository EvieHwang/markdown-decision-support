# Declaration — Surface Redesign (GitHub / Primer aesthetic)

*Feature 7 — a presentation-layer overhaul of the single candidate surface. Roadmap
addition beyond #1–#6: a high-fidelity visual + interaction redesign of the demo surface
for the hiring-manager audience, building on the frozen F1–F5 engine.*

## What
Re-skin the one candidate surface in a refined GitHub / Primer aesthetic and replace the
current `CustomizationView` with a new active surface (`MarkdownSurface`). The redesign
adds: a **light/dark theme** (system-preference default, toggle persisted); **richer
candidate rows** (rank + reason-encoded severity meter, reason label, tier badge, an
inline plan-vs-actual **sparkline**, and a `price → markdown` read); an **expandable
per-row detail panel** (why-it's-flagged + a First/Second/Clearance **tier ladder** with a
floor-cap explainer + the four inline edit fields); **live inline editing** that recomputes
and **re-ranks** the list; and a **self-documenting frame** (sticky top bar, hero, a 5-step
"how the engine works" pipeline strip, a "how to read a row" anatomy block, and a footer
restating that the engine is deterministic and the decision is the buyer's).

The **deterministic engine does not change**: every flag, number, tier, and sentence is
still produced by the existing `src/*.ts` core. This feature replaces only the view layer,
plus one pure, behavior-preserving engine *export* (`baseTierIndex`) and a new
presentation-only copy module (`src/presentation.ts`).

## Why
F1–F5 proved the engine and gave it a working dark surface, but the project declaration
names a secondary audience — hiring managers evaluating product judgment — who land cold.
A polished, self-explaining, GitHub-native surface makes the thesis (a deterministic,
purpose-fit instrument, not an AI optimizer) legible on sight: the pipeline strip and
anatomy teach what the tool does and how to read it, the rich rows and sparklines make the
plan-vs-actual reasoning concrete, and live re-ranking proves it's a real engine. The
existing surface is functional but utilitarian; this is the demo-presentation polish the
portfolio audience needs.

## Success
- The active app renders the new `MarkdownSurface`: the same severity-ranked candidate
  partition as `evaluateClass`, one rich row per flagged CC, the on/ahead-of-plan CCs in a
  quiet section, an empty state when nothing is behind plan — all driven by the unchanged
  engine.
- A cold visitor sees the determinism framing without interacting: a 5-step pipeline strip,
  a "how to read a row" anatomy block, and a footer that states the recommendations are
  rule-based (no AI/optimizer) and the markdown call stays with the buyer.
- Each candidate row carries its case: reason label, suggested tier (+ %), the meta read
  (pts behind / wks left / units / price → markdown), and an inline plan-vs-actual
  sparkline with a screen-reader text alternative.
- Expanding a row reveals the detail panel — a First/Second/Clearance tier ladder showing
  each tier's discount, discounted price, and whether it clears the floor (chosen tier
  marked; a note explaining a floor cap when severity pointed deeper) — and the four inline
  edit fields. Editing recomputes and re-ranks live; a sold-out edit drops the candidate;
  no `NaN` ever appears.
- A light/dark toggle switches the theme, defaulting to the OS preference and persisting
  the user's override across loads.
- The surface keeps the AA-targeted accessibility baseline (one `main`, one `h1`,
  non-skipping headings, accessibly-named controls, `aria-expanded` disclosure rows,
  sparkline text alternatives) — inheriting demo-5's acknowledged WCAG-AA-audit deferral.
- The frozen F1–F5 envelope (engine, tier, classifier, generator, `Candidate` shape,
  tier↔percentage mapping, floor cap, the lockstep) continues to pass unchanged; the one
  engine touch is exporting `baseTierIndex` as-is.

## Shape touched
- **Candidate surface — replaced.** A new `MarkdownSurface` (plus presentation components:
  pipeline strip, anatomy, candidate row, detail panel, edit field, sparkline, reason
  label, tier badge, stat, icon set, FLIP hook) becomes the active surface. `App.tsx` stays
  a thin shell rendering it.
- **Presentation copy — new.** `src/presentation.ts` holds `REASON_META` / `TIER_META`
  (label text, kind, rule/note copy) — presentation only, no engine logic.
- **Engine — one pure export only.** `baseTierIndex` is exported from `src/tier.ts` as-is
  (currently module-private). No behavior change.
- **Removed.** `CustomizationView.tsx` and `TrajectoryChart.tsx` are deleted (their roles
  are taken by `MarkdownSurface` and `Sparkline`). The four prior surface suites that
  imported `CustomizationView` are rewritten to target the new surface.

## Out of scope
- Any change to the decision engine, tier recommender, explanation composer, or synthetic
  data generator — and any change to the frozen `Candidate` shape, the tier↔percentage
  mapping, the floor cap, or the F1↔F2↔F3↔F4 lockstep. `baseTierIndex` is exported, not
  modified.
- New editable inputs or any change to F2's four editable fields (sell-through, price,
  floor, weeks) — they move into the detail panel but stay exactly four, same semantics.
- A component-library migration — the established pattern is raw Tailwind + hand-rolled
  components; this redesign stays on it (no shadcn/ui, no Radix, no icon dependency).
- A persisted settings panel: density / accent / spotlight ship as hardcoded defaults
  (regular / blue / on), not user controls. Only the light/dark theme is a live, persisted
  control.
- A full WCAG 2.1 AA criterion audit (color contrast, focus-visible, reflow/zoom) — the
  surface targets the AA baseline; the full audit remains demo-5's acknowledged deferral.
- Deploy / GitHub Pages changes (owned by F6; the static build pipeline is untouched).
- FLIP animation timing/curves, exact SVG sparkline geometry, exact token values, and pixel
  fidelity — verified by design review, not automated tests (jsdom computes no layout).
