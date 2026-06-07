# Declaration — Plan-vs-Actual Drill-Down

*Feature 4 — normal mode (depth on a coherent slice).*

## What
Give each CC an on-demand **per-CC trajectory view**: an inline expand under its row
that draws the **plan curve** (full season) against the **actual sell-through curve**
(observed weeks) on one shared week axis, with a marker at the current week, so the
buyer *sees* the trajectory behind each flag instead of reading it as a sentence. The
chart is a small hand-rolled SVG — no chart library. It is available on every row,
candidate and on-plan alike, and it recomputes live with F2 edits.

## Why
The project's thesis is *legible* reasoning a buyer trusts as their own. F1–F3 turned
the verdict into a diagnosis in words ("never got going — 40 pts behind, 4 wks left").
But "behind plan" is fundamentally a *shape*: a curve that lagged from the start reads
differently from one that tracked plan and then stalled, and a buyer triaging by feel
wants to *see* that shape, not take the engine's word for it. This feature makes the
trajectory concrete — the legibility F3 promised in language, now shown — and turns the
`actualCurve` F3 added into the picture it was always meant to become.

## Success
- From any row (candidate or on-plan), the buyer can expand a per-CC chart that draws
  the plan curve over the whole season and the actual sell-through over the weeks
  observed so far, on one shared week axis, with the current week marked.
- The chart never contradicts the row beside it: the actual line is anchored to the
  engine's **live** current position (`weeksElapsed`, `actualCumulativeFraction`), so
  after an F2 edit the picture moves with the verdict. Observed history renders as a
  solid line; when an edit pulls the live position away from observed history, the
  divergent final segment renders distinctly (dashed) — an honest "this is your
  hypothetical, not the recorded path."
- Fully deterministic and reproducible from the seed. Opening a chart adds **no** new
  editable control — F2's four-controls-per-CC contract is preserved. The F1/F2/F3
  pipeline, lockstep, and surface contracts continue to pass unchanged.
- The chart carries a text alternative so it is not a content-free image; a full
  WCAG 2.1 AA audit stays deferred to Roadmap #5.

## Shape touched
- **Candidate surface** — each row gains a collapsible trajectory chart (presentation;
  a new view within the existing surface, not a new screen or route).
- **Decision engine / pipeline** — *read only*. The chart consumes the curves already on
  `CC` (`planCurve`, `actualCurve`) and the engine-live current position; no engine,
  tier, classifier, or `Candidate`-shape change.

## Out of scope
- Designed empty/edge-state treatment, on-screen thesis framing, visual polish, and the
  full WCAG 2.1 AA audit (Roadmap #5).
- Deploy (Roadmap #6).
- Any new editable control, and any change to the four F2-editable inputs — the curves
  and inventory remain non-editable; this feature only *reads* them.
- Removing or refactoring the now-app-unused `CandidateSurface.tsx` (it remains the
  test harness for the F1/F3 surface suites; touching it would rewrite prior features'
  tests — explicitly deferred).
- Any change to the frozen `Candidate` shape, the tier label↔percentage mapping, the
  floor cap, or the F1↔F2↔F3 lockstep.
- A printed gap *number* inside the chart — the gap stays authoritative on the row; the
  chart shows the gap as the visible distance between the two lines (see spec Design).
