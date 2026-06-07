import type { CC, Candidate, ClassEvaluation, Evaluation } from '@/types';
import { generateProductClass } from '@/data';
import { evaluate } from '@/engine';
import { recommendTier } from '@/tier';
import { composeExplanation } from '@/explanation';

/**
 * Turn one evaluated CC into a full `Candidate` row: recommend a floor-capped tier
 * and compose the deterministic explanation. The single place the F1 Candidate
 * shape is assembled, so both entry paths (`buildCandidates`, `evaluateClass`)
 * produce identical rows.
 */
function toCandidate(cc: CC, evaluation: Evaluation): Candidate {
  const recommendation = recommendTier({
    severity: evaluation.severity,
    price: cc.price,
    liquidationFloor: cc.liquidationFloor,
  });

  return {
    id: cc.id,
    name: cc.name,
    price: cc.price,
    liquidationFloor: cc.liquidationFloor,
    severity: evaluation.severity,
    weeksRemaining: evaluation.weeksRemaining,
    gapPoints: Math.round(evaluation.gap * 100),
    tier: recommendation.tier,
    discountPct: recommendation.discountPct,
    discountedPrice: recommendation.discountedPrice,
    explanation: composeExplanation(cc, evaluation, recommendation),
  };
}

/**
 * Whole-class recompute (Feature 2): evaluate an arbitrary set of CCs — generator-
 * produced or buyer-edited — into a total, disjoint partition. `candidates` are the
 * flagged (behind-plan) CCs as full `Candidate` rows, sorted by severity descending;
 * `nonCandidates` are everything else (on plan, ahead, or behind below threshold),
 * present but carrying no markdown call.
 *
 * Pure and deterministic: deep-equal input ⇒ deep-equal output. Stays in lockstep
 * with F1 — `evaluateClass(generateProductClass(seed)).candidates` deep-equals
 * `buildCandidates(seed)` for every seed, because both compose `toCandidate`.
 */
export function evaluateClass(ccs: CC[]): ClassEvaluation {
  const candidates: Candidate[] = [];
  const nonCandidates: ClassEvaluation['nonCandidates'] = [];

  for (const cc of ccs) {
    const evaluation = evaluate(cc);
    if (evaluation.flagged) {
      candidates.push(toCandidate(cc, evaluation));
    } else {
      nonCandidates.push({
        id: cc.id,
        name: cc.name,
        price: cc.price,
        gapPoints: Math.round(evaluation.gap * 100),
        weeksRemaining: evaluation.weeksRemaining,
        flagged: false,
      });
    }
  }

  candidates.sort((a, b) => b.severity - a.severity);
  return { candidates, nonCandidates };
}

/**
 * The deterministic spine for a generated class: generate → evaluate → recommend →
 * explain, keeping only flagged (behind-plan) CCs, sorted by severity descending.
 *
 * Deterministic in `seed`: same seed ⇒ deep-equal list. Every element respects the
 * floor invariant (`discountedPrice ≥ liquidationFloor`). Composes `evaluateClass`
 * so the read-only F1 surface and the F2 interactive surface never drift.
 */
export function buildCandidates(seed: number): Candidate[] {
  return evaluateClass(generateProductClass(seed)).candidates;
}
