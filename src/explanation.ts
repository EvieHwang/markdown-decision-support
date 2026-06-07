import type { CC, Evaluation, Recommendation, ReasonArchetype } from '@/types';
import { FLAG_THRESHOLD, earlyCheckpointIndex } from '@/engine';

// Classification design constants (Feature 3). Tests assert the classification
// behavior either side of each boundary and the priority ordering, not the
// constants. A CC at or below CLIFF_WEEKS is a seasonal-cliff; a CC whose unsold
// stock per remaining week is at or above INVENTORY_PRESSURE is inventory-depth.
const CLIFF_WEEKS = 2;
const INVENTORY_PRESSURE = 300;

/**
 * The gap between plan and the *observed* actual at the early checkpoint, or `null`
 * when no actual curve is available (a hand-built/legacy CC). A positive gap beyond
 * the flag threshold means the CC was already behind plan early on (never-started);
 * a gap within the threshold means it tracked plan early (decelerating candidate).
 */
function earlyGap(cc: CC): number | null {
  const curve = cc.actualCurve;
  if (!curve || curve.length === 0) return null;
  const idx = Math.min(
    earlyCheckpointIndex(cc.weeksElapsed),
    curve.length - 1,
    cc.planCurve.length - 1,
  );
  return cc.planCurve[idx] - curve[idx];
}

/** The current plan-vs-actual gap "now", mirroring the engine's reading. */
function currentGap(cc: CC): number {
  const idx = Math.min(Math.max(cc.weeksElapsed - 2, 0), cc.planCurve.length - 1);
  return cc.planCurve[idx] - cc.actualCumulativeFraction;
}

/**
 * Classify the single most decision-relevant reason a CC is behind plan, by the
 * fixed urgency-first priority
 * `seasonal-cliff > inventory-depth > decelerating > never-started > behind-plan`:
 * the first archetype whose condition the CC meets.
 *
 * Pure and deterministic in the CC. The two trajectory archetypes read the actual
 * curve; without one they are simply unavailable (the classifier falls through to an
 * urgency archetype or the baseline) and it never throws. `behind-plan` is always
 * available, so every CC gets a valid archetype.
 */
export function classifyReason(cc: CC): ReasonArchetype {
  if (cc.weeksRemaining <= CLIFF_WEEKS) return 'seasonal-cliff';

  const safeWeeks = Math.max(cc.weeksRemaining, 1);
  if (cc.inventoryUnits / safeWeeks >= INVENTORY_PRESSURE) return 'inventory-depth';

  const early = earlyGap(cc);
  if (early !== null) {
    // never-started and decelerating are mutually exclusive by construction: the
    // early-checkpoint gap is either over the flag threshold or under it.
    if (early > FLAG_THRESHOLD) return 'never-started';
    if (currentGap(cc) > FLAG_THRESHOLD) return 'decelerating';
  }

  return 'behind-plan';
}

/**
 * One deterministic, plain-language sentence in the buyer's vocabulary (Feature 3):
 * it speaks the candidate's reason archetype while preserving the frozen facts — the
 * gap in points (`<gapPoints> pts`), the weeks remaining (`<weeksRemaining> wks`),
 * and the suggested tier. Distinct archetypes render distinguishable sentences.
 *
 * The gap is formatted from the same integer points the `Candidate` carries
 * (round(gap × 100)) so the displayed number and `gapPoints` always agree. No LLM,
 * no randomness; rendered as text downstream (no HTML).
 */
export function composeExplanation(
  cc: CC,
  evaluation: Evaluation,
  recommendation: Recommendation,
): string {
  const reason = classifyReason(cc);
  const gapPoints = Math.round(evaluation.gap * 100);
  const wks = evaluation.weeksRemaining;
  const suggest = `suggest ${recommendation.tier} (${recommendation.discountPct}% off)`;

  switch (reason) {
    case 'never-started':
      return (
        `${cc.name}: never got going — ${gapPoints} pts behind plan from the start, ` +
        `${wks} wks left — ${suggest}.`
      );
    case 'decelerating':
      return (
        `${cc.name}: lost momentum — tracked plan early then stalled, now ` +
        `${gapPoints} pts behind, ${wks} wks left — ${suggest}.`
      );
    case 'seasonal-cliff':
      return (
        `${cc.name}: running out of runway — only ${wks} wks left to clear a ` +
        `${gapPoints} pts shortfall — ${suggest}.`
      );
    case 'inventory-depth':
      return (
        `${cc.name}: stock piling up — ${gapPoints} pts behind plan with heavy ` +
        `inventory and ${wks} wks left — ${suggest}.`
      );
    case 'behind-plan':
    default:
      return `${cc.name}: ${gapPoints} pts behind plan, ${wks} wks left — ${suggest}.`;
  }
}
