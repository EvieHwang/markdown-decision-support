# Handoff: Markdown Decision Support — UI redesign (GitHub / Primer aesthetic)

## Overview
This is a **presentation-layer redesign** of the existing Markdown Decision Support app. It re-skins the single candidate surface in a refined GitHub / Primer aesthetic with a light/dark toggle, richer candidate rows (reason label, tier badge, inline plan-vs-actual sparkline, price→markdown), an expandable per-row detail panel (why-flagged + tier ladder + floor-cap explainer), live inline-editing with smooth FLIP re-ranking, and a self-documenting frame (pipeline strip + "how to read a row" anatomy) aimed at the hiring-manager audience.

> **The deterministic engine does not change.** Every rule, number, tier, and sentence is still produced by the existing core. This redesign only replaces the view layer.

## About the design files
The files in this bundle are **design references authored in plain HTML/JS/CSS + in-browser React** — a working prototype of the intended look and behavior, **not** production code to paste in. Your task is to **recreate this design inside the existing repo** (`EvieHwang/markdown-decision-support` — React 18 + Vite + TypeScript + Tailwind + shadcn/ui) using its established patterns. The prototype's engine is a hand-port of your real `src/*.ts` core; **use your existing TypeScript modules, not the ported JS.**

## Fidelity
**High-fidelity.** Final colors, typography, spacing, interactions, and copy. Recreate pixel-faithfully using Tailwind + your component patterns. Exact token values are in **Design Tokens** below; the prototype's `styles.css` / `app.css` are the source of truth for any value not listed.

---

## What changes vs. what stays

### Stays (do not touch — these already exist in `src/`)
- `src/data.ts` — `generateProductClass(seed)`
- `src/engine.ts` — `evaluate`, `earlyCheckpointIndex`, `FLAG_THRESHOLD`
- `src/tier.ts` — `recommendTier`, `baseTierIndex` *(see note)*
- `src/explanation.ts` — `classifyReason`, `composeExplanation`
- `src/trajectory.ts` — `buildTrajectory`
- `src/edit.ts` — `applyEdit`
- `src/pipeline.ts` — `evaluateClass`
- `src/types.ts` — all domain types

> **One tiny engine addition:** the detail panel's "why this tier" ladder needs `baseTierIndex(magnitude)` exported from `tier.ts` (it's currently module-private). Export it as-is — pure, no behavior change. The prototype mirrors this in `engine.js`.

### Rebuilt (the redesign)
Replaces `src/components/CustomizationView.tsx` and `src/components/TrajectoryChart.tsx`, adds new presentation components and a token layer. `App.tsx` stays a thin shell.

---

## Component map (prototype → repo)

| Prototype | Build as | Notes |
|---|---|---|
| `app.jsx` › `App` | `src/components/MarkdownSurface.tsx` | top-level: state (`ccs`, `seed`, `openId`), `useMemo(evaluateClass)`, theme effect |
| `app.jsx` › `PipelineStrip` | `src/components/PipelineStrip.tsx` | static 5-step explainer |
| `app.jsx` › `Anatomy` / `AnatomyRow` | `src/components/Anatomy.tsx` | annotated sample row + numbered legend |
| `app.jsx` › `useFlip` | `src/hooks/useFlip.ts` | FLIP re-ranking; port verbatim |
| `rows.jsx` › `CandidateRow` | `src/components/CandidateRow.tsx` | the rich row |
| `rows.jsx` › `DetailPanel` | `src/components/DetailPanel.tsx` | why-flagged + tier ladder + edit fields |
| `rows.jsx` › `EditField` | `src/components/EditField.tsx` | controlled numeric input (local draft + commit) |
| `rows.jsx` › `NonCandidateRow` | `src/components/NonCandidateRow.tsx` | quiet row |
| `ui.jsx` › `Sparkline` | `src/components/Sparkline.tsx` | hand-rolled SVG; replaces `TrajectoryChart.tsx` |
| `ui.jsx` › `ReasonLabel`, `TierBadge`, `Stat`, `Icon` | `src/components/ui/*` | primitives |
| `ui.jsx` › `MDS_ICON_PATHS` | `src/components/ui/Icon.tsx` | 16px stroke icon set (or swap for your icon lib — see Assets) |
| `engine.js` › `REASON_META`, `TIER_META` | `src/presentation.ts` | label text / kind / rule copy — **presentation only**, keep out of the engine |

---

## Screens / Views

### Single screen: the candidate surface
Max-width **1040px** column, centered, `padding: 30px 24px 80px`. Page background `--canvas-subtle`. Sticky translucent top bar above it.

**Vertical order:**
1. **Top bar** (sticky) — brand (gradient glyph + "Markdown Decision Support · women's shoes"), spacer, a "deterministic engine · seed N" chip, and a **Light/Dark segmented toggle**.
2. **Hero** — h1 *"Which colorways should I mark down — and why?"*, a 70ch lede paragraph, and 3 chips: "Rule-based, no AI or optimizer" (green check), "Edit any input · re-ranks live" (sync), "Suggests, never decides" (purple info).
3. **Pipeline strip** — uppercase label "HOW THE ENGINE WORKS — DETERMINISTIC, NO AI", then a 5-col grid: numbered circle + title + description. Steps: **Generate / Compare / Flag / Rank / Recommend** (exact copy in `app.jsx` `PIPE`).
4. **"Behind plan" box** (GitHub Box: bordered, rounded 6px, subtle-bg header). Header: red "open" dot + "Behind plan" + counter pill; "↓ ranked by urgency"; right-aligned controls — seed number input + "Regenerate" button.
   - **Anatomy block** (collapsible via tweak) inside the box, above the list: dashed-border sample row using `candidates[0]` with inline numbered **pins (1–5)**, then a responsive legend grid mapping each pin to a label + description.
   - **Candidate list** — `<ul>` of `CandidateRow`, one per flagged CC, separated by `--border`.
   - **Empty state** when `candidates.length === 0`: green check glyph, "Nothing is behind plan".
5. **"On or ahead of plan" box** — quiet rows (`NonCandidateRow`), only when `nonCandidates.length > 0`.
6. **Footer note** — bordered card, purple info icon, deterministic-and-the-decision-is-yours copy.
7. **Tweaks panel** — optional in prod (see State Management).

### CandidateRow (anatomy)
Grid `42px | 1fr | 184px | 22px`, gap 14px, padding `var(--row-py) 16px`, hover bg `--canvas-subtle`. The whole row is a `<button>` toggling the detail panel (`aria-expanded`).
- **Rail (42px):** rank number (mono) + a 5px-wide vertical **severity meter** whose fill height = `severity / maxSeverity` and whose color encodes the reason (cliff=danger, inventory=orange, decelerating=attention, else accent). Fill height transitions 0.4s.
- **Body:** title line = CC name (accent, 600, underline on row hover) + `ReasonLabel` + `TierBadge`; explanation sentence (`--fg-muted`, max 64ch, with the leading "Name: " stripped); meta line = `Stat`s separated by 3px dots — "N pts behind" (tinted by reason), "N wks left" (clock), "N units" (package), "$price → **$markdown**" (dollar).
- **Sparkline (184px):** the SVG + a tiny legend ("plan" dashed / "actual" solid).
- **Chevron (22px):** rotates 180° when open.

### DetailPanel (expanded)
`padding: 4px 16px 18px 68px` (left-indented to align under the body; collapses to 16px under 720px). Two cards in a `1fr 1fr` grid (stack < 720px):
- **Why it's flagged:** `ReasonLabel` + its rule sentence; then a small `<dl>` — "Plan checkpoint now" %, "Actual sell-through" %, and an emphasized danger-colored "Gap behind plan N pts".
- **Why this tier:** a **3-row ladder** (First/Second/Clearance), each row = tier name · `discountPct` · discounted price · "clears floor"/"below floor". Chosen tier row highlighted green with a check; rows below the floor are dimmed (`opacity .5`). Below the ladder, an info note: if `chosenIdx < baseIdx`, *"Severity pointed to {intendedTier}, but the {floor} liquidation floor caps it at {tier}."*; otherwise the tier's `note`.
- **Edit block (full width):** "ADJUST INPUTS — THE ENGINE RE-RANKS LIVE", a 4-col grid (2-col < 640px) of `EditField`s: Sell-through %, Price $, Floor $, Weeks elapsed. Each commits through `applyEdit(cc, field, value)` (note Sell-through is /100). Editing recomputes `evaluateClass` and re-sorts; FLIP animates the move.

### Sparkline (replaces TrajectoryChart)
Default 168×46 (108×28 in non-candidate rows). Map week→x over `weeksTotal`, fraction→y inverted. Draw:
- soft area fill under observed actual (accent gradient, 0.16→0);
- dashed current-week vertical rule (`--border`);
- a 2.5px **gap bracket** at "now" between plan-now and actual-now — `--danger-fg` if behind, `--success-fg` if ahead;
- **plan** line: `--fg-subtle`, 1.4px, dashed;
- **actual** observed: `--accent-fg`, 1.8px solid; the post-edit hypothetical segment dashed (when `buildTrajectory().divergent`);
- two dots at "now": hollow plan dot + filled accent actual dot.
Keep `role="img"` + an aria-label naming the CC and its actual-vs-plan at the current week.

---

## Interactions & Behavior
- **Expand/collapse row:** single-open accordion (`openId`); click toggles; chevron rotates 180° (0.2s).
- **Live edit → re-rank:** any `EditField` change → `applyEdit` → new `ccs` → `evaluateClass` re-partitions + re-sorts by `severity` desc. A CC can cross between "behind plan" and "on/ahead of plan" live (counters update).
- **FLIP animation:** capture row `top`s before commit, invert, transition `transform 0.44s cubic-bezier(0.22,1,0.36,1)`; only animate when the order signature (`candidates.map(c=>c.id).join(',')`) changes — not on expand. Respect `prefers-reduced-motion`.
- **Seed input / Regenerate:** set seed → `generateProductClass(seed)`; Regenerate = `seed + 1`. Both discard pending edits and close any open row (matches current behavior — re-entering the same seed should still rebuild).
- **Theme toggle:** sets `data-theme` on `<html>`; persists (see below).
- **Entrance:** `.rise` is **transform-only** (translateY 7→0), never an opacity-0 keyframe — so content stays visible if the timeline is frozen (print/SSR). Keep this.
- **Hover/focus:** row hover bg; `:focus-visible` accent ring on the row button and inputs; labels carry `title` tooltips with the rule text.
- **Responsive:** < 680px the pipeline becomes 2-col, sparklines hide, row grid drops the sparkline column; detail grid + edit grid collapse to 1/2 cols at 720/640px.

## State Management
- `seed: number` (default 42), `ccs: CC[]` (working set; edits live here), `openId: string | null`.
- Derived via `useMemo`: `{ candidates, nonCandidates } = evaluateClass(ccs)`; `byId` map; `maxSeverity = candidates[0]?.severity ?? 1`; `orderSig`.
- **Settings** (prototype's "Tweaks"): `theme` (`'light'|'dark'`), `density` (`'compact'|'regular'|'comfortable'` → `data-density`), `accent` (hex → overrides `--accent-fg/-emphasis/-subtle`), `showAnatomy` (bool), `spotlight` (bool, insets an accent bar on `candidates[0]`). In production, expose these as a small Settings menu **or** hardcode sensible defaults (dark, regular, blue, anatomy on) and drop the panel — your call. Persist `theme` (and any kept settings) to `localStorage`.
- No data fetching; everything is synchronous and deterministic.

## Design Tokens

**Light** — canvas `#ffffff`, canvas-subtle `#f6f8fa`, canvas-inset `#eef1f4`, border `#d1d9e0`, border-muted `#e6ebf0`, fg `#1f2328`, fg-muted `#59636e`, fg-subtle `#818b98`, accent `#0969da`, accent-subtle `#ddf4ff`, success `#1a7f37`/`#dafbe1`, attention `#9a6700`/`#fff8c5`, orange `#bc4c00`/`#fff1e5`, danger `#d1242f`/`#ffebe9`, done `#8250df`/`#fbefff`, muted `#59636e`/`#eaeef2`, btn-bg `#f6f8fa`, btn-border `#d1d9e0`.

**Dark** — canvas `#0d1117`, canvas-subtle `#161b22`, canvas-inset `#010409`, border `#3d444d`, border-muted `#21262d`, fg `#e6edf3`, fg-muted `#9198a1`, fg-subtle `#6e7681`, accent `#4493f8`/emphasis `#1f6feb`, accent-subtle `#121d2f`, success `#3fb950`/`#12261e`, attention `#d29922`/`#272115`, orange `#db6d28`/`#2a1c10`, danger `#f85149`/`#25171c`, done `#ab7df8`/`#1d1827`, muted `#9198a1`/`#21262d`, btn-bg `#21262d`, btn-border `#3d444d`.

**Reason → label kind:** seasonal-cliff→danger, inventory-depth→orange, decelerating→attention, never-started→done(purple), behind-plan→muted. Labels = tinted bg + colored text + 30%-mix border, pill radius, 12px/500, 20px tall, 7px dot. **Tier → kind:** First→success, Second→attention, Clearance→danger.

**Type:** system sans (`-apple-system, "Segoe UI", "Noto Sans", Helvetica, Arial`); mono (`ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas`) with `font-variant-numeric: tabular-nums` for all numbers. Sizes: h1 27px/640, lede 15.5px, body 14px, meta/labels 12–13px. **Radii:** sm 4 / md 6 / lg 12 / pill 2rem. **Density `--row-py`:** compact 9 / regular 14 / comfortable 20px. **Shadows:** sm `0 1px 0 rgba(31,35,40,.04)` (none in dark); md/lg per `styles.css`.

> Recommended: encode these as CSS custom properties on `[data-theme]` (exactly as `styles.css` does) and reference them from Tailwind via `theme.extend.colors` using `var(--token)`, so utilities like `bg-canvas` / `text-fg-muted` work. shadcn/ui already uses a CSS-var theming pattern — slot these in alongside it.

## Assets
- **Icons:** a 16px stroke set is hand-drawn in `ui.jsx` (`MDS_ICON_PATHS`: clock, package, tag, pulse, pencil, chevron, sync, sun, moon, search, alert, info, check, dollar, arrowDown, flag, sliders, x, layers, book). Reuse them, or map each to your icon library (Octicons is the natural GitHub-aesthetic fit; lucide-react also works). No raster assets, no external fonts.
- **Brand glyph:** a gradient rounded square with the `pulse` icon — pure CSS, no image.

## Files in this bundle
- `Markdown Decision Support.html` — entry/shell (script load order)
- `engine.js` — JS port of your `src/*.ts` core **+** `REASON_META`/`TIER_META` presentation copy (reference only; ship your TS modules)
- `ui.jsx` — Icon set, Sparkline, ReasonLabel, TierBadge, Stat
- `rows.jsx` — CandidateRow, DetailPanel, EditField, NonCandidateRow
- `app.jsx` — App, PipelineStrip, Anatomy, useFlip, settings/tweaks wiring
- `styles.css` — token layer (light/dark vars) + Label/Box/Button/input primitives
- `app.css` — layout & component styling (topbar, hero, pipeline, anatomy, rows, detail, sparkline legend, non-candidates, footer, responsive)
- `tweaks-panel.jsx` — prototype settings shell (not needed in prod; replace with a real Settings menu or omit)

## Suggested build order
1. Export `baseTierIndex` from `tier.ts`; add `src/presentation.ts` (REASON_META/TIER_META).
2. Token layer: CSS vars on `[data-theme]` + Tailwind color mapping; verify light/dark swap.
3. Primitives: `Icon`, `ReasonLabel`, `TierBadge`, `Stat`, `Sparkline`.
4. `CandidateRow` (no detail yet) wired to `evaluateClass` → confirm list + ranking parity with current app.
5. `DetailPanel` (ladder + edit) → confirm live recompute.
6. `useFlip` re-ranking.
7. `PipelineStrip` + `Anatomy` + hero + footer.
8. Settings (theme/density/accent/anatomy/spotlight) + `localStorage`; top-bar theme toggle.
9. Responsive pass + `prefers-reduced-motion` + a11y (focus rings, aria-expanded, sparkline aria-labels).
