# Declaration — Demo Presentation Pass

*Feature 5 — normal mode (presentation polish on a coherent four-feature slice).*

## What
Turn the working four-feature engine into something a cold visitor understands and
trusts on sight. Three threads: **(a)** an **expandable thesis framing** ("how this
works") that explains the tool is deterministic, not an AI optimizer — collapsed by
default so it never crowds the buyer's working screen; **(b)** **designed empty states**
— a deliberate screen when no CC is behind plan (and graceful handling when every CC is
flagged) instead of a bare zero-count list; **(c)** a **visual polish pass** applying the
constitution's aesthetic (always-dark, information-dense, 14px base, tight line heights)
consistently via codified spacing/type/color tokens — following the established
raw-Tailwind pattern, no component library, no bespoke illustrations.

## Why
F1–F4 proved the engine. But the project declaration names a *secondary* audience —
hiring managers evaluating product judgment — who land cold and currently get no framing
of what they're seeing or why it's trustworthy-not-magic. And the empty/edge states F3
and F4 explicitly deferred to this Roadmap item render as bare lists today. This pass
serves that visitor and closes the deferred presentation debt, without touching the
deterministic core the previous features froze.

## Success
- A cold visitor can expand a framing element and understand what the tool decides and
  why it is deterministic (not AI); collapsed by default, it does not intrude on the
  primary buyer flow.
- When edits drive every candidate off the list, the surface shows a deliberate "nothing
  behind plan" state, not a blank or bare zero-count list; the mirror case (every CC
  flagged → empty non-candidate section) renders gracefully rather than as a broken
  heading over an empty list.
- The surface is semantically structured and keyboard-operable (a single `h1`, a main
  landmark, accessible names on controls, a disclosure exposing `aria-expanded`) —
  **AA-targeted; a full WCAG 2.1 AA criterion-by-criterion audit is explicitly deferred
  as an acknowledged deviation** from the constitution's binding standard.
- Consistently dark with a codified spacing / type / color treatment matching the
  constitution aesthetic.
- The entire F1–F4 envelope (the frozen `Candidate` shape, the tier↔percentage mapping,
  the liquidation-floor cap, F2's exactly-four-editable-controls-per-CC, the
  candidate / non-candidate rows, the F1↔F2↔F3↔F4 lockstep, and the trajectory chart)
  continues to pass unchanged.

## Shape touched
- **Candidate surface (`CustomizationView`)** — presentation only: a new framing element,
  empty-state rendering, and consistent styling. A new presentational element within the
  existing surface, not a new screen or route.
- **No engine / tier / classifier / generator change.** `CandidateSurface.tsx` (the
  now-app-unused F1/F3 surface test harness) is untouched — touching it would rewrite
  prior features' tests.

## Out of scope
- Deploy / GitHub Pages publish (Roadmap #6).
- Any change to the decision engine, tier recommender, explanation composer, or synthetic
  data generator — and any change to the frozen `Candidate` shape, tier↔percentage
  mapping, floor cap, or F1↔F2↔F3↔F4 lockstep.
- Any new editable control, or any change to F2's four editable inputs.
- Migrating to a component library (shadcn/ui or other) — the established pattern is raw
  Tailwind; introducing one would be a large refactor, not minimal polish.
- Bespoke empty-state artwork / illustrations — the empty state is well-worded styled text.
- A full WCAG 2.1 AA sign-off, a light theme, or a theme toggle.
- The structurally-unreachable "zero CCs" and "single CC" states: the generator always
  emits ≥ 8 CCs with ≥ 2 behind plan and there is no add/delete-CC control, so these
  cannot occur and are not designed for. The reachable empty states are edit-driven
  (no candidates / every CC flagged), handled above.
