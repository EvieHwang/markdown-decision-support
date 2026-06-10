import type { NonCandidate, HealthArchetype } from '@/types';

/**
 * The non-candidate counterpart to `classifyReason` (Feature 3) and `composeExplanation`.
 * Presentation-only — the engine partitions a CC into a `NonCandidate` (gap ≤ the flag
 * threshold) and this layer names *why it's healthy* so the on/ahead section can state its
 * case with the same depth as a behind-plan candidate row. Pure and deterministic in the
 * non-candidate; no LLM, no randomness; rendered as text downstream (no HTML).
 */
export function classifyHealth(nc: Pick<NonCandidate, 'gapPoints'>): HealthArchetype {
  if (nc.gapPoints < 0) return 'ahead';
  if (nc.gapPoints === 0) return 'on-plan';
  return 'on-track';
}

/**
 * One deterministic, plain-language sentence for a non-candidate, mirroring the candidate
 * explanation's shape: it speaks the health archetype while stating the gap (in the same
 * integer points the `NonCandidate` carries) and the weeks remaining. The leading name is
 * prepended like the candidate sentence, so the row strips it the same way.
 */
export function composeHealthNote(nc: NonCandidate): string {
  const health = classifyHealth(nc);
  const wks = nc.weeksRemaining;
  switch (health) {
    case 'ahead':
      return (
        `${nc.name}: ahead of plan — ${-nc.gapPoints} pts ahead at the checkpoint, ` +
        `${wks} wks left — no markdown needed.`
      );
    case 'on-plan':
      return (
        `${nc.name}: on plan — tracking the checkpoint exactly, ${wks} wks left — ` +
        `no markdown needed.`
      );
    case 'on-track':
    default:
      return (
        `${nc.name}: on track — only ${nc.gapPoints} pts behind, within tolerance, ` +
        `${wks} wks left — no markdown yet.`
      );
  }
}
