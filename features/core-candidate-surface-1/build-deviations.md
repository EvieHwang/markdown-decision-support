# Build deviations — Core Candidate Surface

The build satisfied every test as written. No `@frozen` behavior was changed, no
test was corrected, and no design contradiction forced an alternate
implementation. The pipeline, tier, engine, generator, and surface seams were
all built to the names and shapes the tests named.

The note below is **not** a deviation — nothing diverged — but it surfaces a
latent test-authoring inconsistency for `/retro` to weigh, per the build
contract's "feedback channel back to spec-writing."

## Observation — engine "plan now" index: fixture comment contradicts its array

`engine.test.ts`'s CC fixture comments its plan curve as "at week 6 (index 5) =
0.5", but the array it defines is
`[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98, 1.0]`, where index 5
is **0.6**, not 0.5 (0.5 is at index 4). The binding assertions resolve the
ambiguity unambiguously:

- `gap ≈ 0.2` with `actualCumulativeFraction = 0.3` ⇒ `plannedNow = 0.5`.
- "exactly on plan" (`actual = 0.5`) must be **unflagged** ⇒ `plannedNow = 0.5`.

With `weeksElapsed = 6`, both force `plannedNow = planCurve[weeksElapsed - 2]`
(index 4), so the engine reads the plan checkpoint at `weeksElapsed - 2`. The
implementation follows the assertions, not the misleading "(index 5)" comment.

**Spec/test-authoring lesson:** when a fixture hand-codes an array and also
comments an index→value mapping, the comment and the array can drift. Anchor the
fixture to the value being asserted (and let the index follow), or derive the
"now" value programmatically, so a 1-based/0-based slip in a comment can't
mislead the build about which index is the contract. The generator suite
independently checks "behind plan" at `weeksElapsed - 1`; the two suites use
different conventions for "now," which is harmless here (behind at
`weeksElapsed - 2` implies behind at the larger `weeksElapsed - 1`, since the
curve is non-decreasing) but is worth aligning in a future spec.
