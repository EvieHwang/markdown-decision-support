# Build deviations — Live Customization (F2)

The honest record of where the build diverged from the spec's design recommendation
or corrected a test. The spec's *requirements* were not changed; nothing was kicked
back to `/spec`. Written to be legible to a future spec author (`/retro` mines this).

---

## 1. Seed re-entry needs a native `change` listener, not just React's `onChange`

**What the design implied.** Seam #3 says "Setting the seed to `S` renders
`evaluateClass(generateProductClass(S))`; the same `S` renders identically," and the
obvious implementation is a controlled `<input value={seed} onChange={…}>` that
rebuilds in its React `onChange`.

**Why that doesn't satisfy the test as written.** `surface.test.tsx`'s
"discards pending edits when the class is regenerated from a seed" edits a CC (so the
class is dirty), then re-enters the **same** seed value (`42` → `42`) and asserts the
class rebuilds fresh. React installs a value tracker on controlled inputs; when
`fireEvent.change` sets the value to the one React last rendered, the tracker dedups
and React's synthetic `onChange` **never fires** — so a plain `onChange`-only handler
leaves the edits in place and the test fails (got 6 candidates, expected 7). This was
confirmed empirically, not assumed.

**What was done instead.** The seed input keeps its React `onChange` (live display +
different-value commits) and additionally attaches a **native `change` listener** via
a ref. `fireEvent.change` dispatches a native `change` event that fires regardless of
the tracker's dedup, so re-committing the same seed rebuilds and discards edits. The
behavioral assertion is satisfied as written; no assertion was weakened and no seam
name/path changed.

**Lesson for the next spec author (not a defect in this spec).** A surface test that
asserts "re-entering the *same* value into a controlled input triggers a recompute/
rebuild" is testing through a path React's controlled-input dedup blocks for an
unchanged value. It's a *valid* behavioral contract ("setting seed to S renders
`generateProductClass(S)`"), but verifying it via same-value `fireEvent.change`
quietly forces a non-obvious implementation (native listener / uncontrolled commit).
When spec/test-authoring a controlled-input commit behavior, prefer asserting it
through a path that changes the value (e.g. set a different seed, then set it back and
assert the round trip), or call out in the test that a same-value re-entry must still
commit — so `/build` isn't surprised by the dedup.

---

## Notes (not deviations)

- `buildCandidates(seed)` was refactored to **compose** `evaluateClass(generate
  ProductClass(seed)).candidates`. This is explicitly sanctioned by the spec ("`/build`
  may satisfy [F1 lockstep] by composing one through the other") and makes the F1/F2
  lockstep structural rather than coincidental. F1's `@frozen` `pipeline.test.ts` still
  passes unchanged.
- No `@scaffolding` seam surface was renamed: `applyEdit`, `evaluateClass`,
  `CustomizationView`, the `initialSeed` prop, the `candidate-row`/`noncandidate-row`
  test ids, and the four control labels were all implemented as named.
