import type { Candidate } from '@/types';
import { generateProductClass } from '@/data';
import { evaluate } from '@/engine';
import { recommendTier } from '@/tier';
import { composeExplanation } from '@/explanation';

/**
 * The deterministic spine: generate → evaluate → recommend → explain, keeping
 * only flagged (behind-plan) CCs, sorted by severity descending.
 *
 * Deterministic in `seed`: same seed ⇒ deep-equal list. Every element respects
 * the floor invariant (`discountedPrice ≥ liquidationFloor`).
 */
export function buildCandidates(seed: number): Candidate[] {
  const candidates: Candidate[] = [];

  for (const cc of generateProductClass(seed)) {
    const evaluation = evaluate(cc);
    if (!evaluation.flagged) continue;

    const recommendation = recommendTier({
      severity: evaluation.severity,
      price: cc.price,
      liquidationFloor: cc.liquidationFloor,
    });

    candidates.push({
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
    });
  }

  candidates.sort((a, b) => b.severity - a.severity);
  return candidates;
}
