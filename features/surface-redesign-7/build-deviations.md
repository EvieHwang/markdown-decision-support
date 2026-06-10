# Build deviations — Surface Redesign (Feature 7)

Honest record of where the build diverged from the design recommendation. The spec's
requirements and the frozen tests were satisfied as written; this logs only design-layer
divergences, for `/retro` to mine.

## 1. Stripped explanation is **not** re-capitalized (design recommendation contradicted)

- **Design contradicted:** the prototype's `rows.jsx › stripName` upper-cases the first
  letter of the reason body after stripping the leading `"<name>: "`
  (`s.charAt(0).toUpperCase() + s.slice(1)`). The handoff README carries the same intent.
- **What was done instead:** `src/format.ts › stripName` strips the leading name prefix but
  leaves the body verbatim (no case change), so the displayed text is exactly the engine's
  sentence minus the redundant name.
- **Why:** the `@scaffolding` `surface.test.tsx › renders the explanation with the leading
  "Name: " stripped` asserts a *lowercase* early fragment of the engine body is present in
  the row (`body.split('—')[0].trim().slice(0, 12)`, e.g. `"never got go"`). Re-capitalizing
  the first letter (`"Never got go…"`) makes that case-sensitive `toContain` check fail. The
  test is the contract (R3.3: "the displayed text is otherwise the engine's sentence — no
  re-authored reason copy"), and not mutating case is in fact *more* faithful to "the engine's
  sentence." The capitalization was a cosmetic prototype touch the behavioral contract forbids.
- **Spec-authoring lesson:** none — this is a design/test reconciliation the spec anticipated
  (R3.3 pins the engine sentence as the contract). No test or requirement was changed.

## Notes (anticipated by the spec — not deviations)

- Section headings render as real `<h2>` (`"Behind plan"`, `"On or ahead of plan"`, the
  empty-state heading) and the hero as the single `<h1>`, replacing the prototype's
  `<span class="surface-title">` / `<h3>` markup — required by R10.2 heading-nesting and
  explicitly flagged by the adversarial gate ("the spec is the contract"). No deviation.
- Density / accent / spotlight ship as hardcoded defaults and the prototype's Tweaks panel is
  omitted — per spec Out of scope (only light/dark theme is a live, persisted control). No
  deviation.
