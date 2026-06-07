import type { CC, Evaluation, Recommendation } from '@/types';

/**
 * One deterministic, plain-language sentence in the buyer's vocabulary: how far
 * behind plan (in points), how many weeks remain, and the suggested tier. A
 * single template — branching vocabulary is Roadmap #3.
 *
 * The gap is formatted from the same integer points the `Candidate` carries
 * (round(gap × 100)) so the displayed number and `gapPoints` always agree.
 */
export function composeExplanation(
  cc: CC,
  evaluation: Evaluation,
  recommendation: Recommendation,
): string {
  const gapPoints = Math.round(evaluation.gap * 100);
  const wks = evaluation.weeksRemaining;
  return (
    `${cc.name}: ${gapPoints} pts behind plan, ${wks} wks left — ` +
    `suggest ${recommendation.tier} (${recommendation.discountPct}% off).`
  );
}
