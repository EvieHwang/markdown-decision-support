import type { Recommendation, Tier } from '@/types';

// The fixed tier set, shallow → deep. The label↔percentage correspondence is
// from the declaration and is not adjustable.
const TIERS: ReadonlyArray<{ tier: Tier; discountPct: number }> = [
  { tier: 'First', discountPct: 15 },
  { tier: 'Second', discountPct: 25 },
  { tier: 'Clearance', discountPct: 40 },
];

// Severity selects a base tier (deeper severity ⇒ deeper base tier). Thresholds
// are a basic design choice for the skeleton; Roadmap #3 enriches the model.
//
// Exported (Feature 7) as-is — a pure, behavior-preserving magnitude→index function
// the redesign's "why this tier" ladder reads to explain intended-vs-floor-capped
// tier reasoning. No behavior change: `recommendTier` calls this same function.
export function baseTierIndex(severity: number): number {
  if (severity >= 0.3) return 2; // Clearance
  if (severity >= 0.15) return 1; // Second
  return 0; // First
}

function discounted(price: number, discountPct: number): number {
  return price * (1 - discountPct / 100);
}

/**
 * Recommends a markdown tier, capped by the liquidation floor: the deepest tier
 * at or shallower than the severity-indicated base tier whose discounted price
 * stays at or above the floor. Within the generator's guaranteed domain
 * (floor ≤ price × 0.85) the First tier always qualifies.
 */
export function recommendTier({
  severity,
  price,
  liquidationFloor,
}: {
  severity: number;
  price: number;
  liquidationFloor: number;
}): Recommendation {
  const baseIdx = baseTierIndex(severity);

  // Deeper tiers have a lower discounted price, so the tiers that respect the
  // floor form a shallow prefix. Scan shallow → deep within the allowed range
  // and keep the deepest one that still clears the floor.
  let chosen = TIERS[0];
  for (let i = 0; i <= baseIdx; i++) {
    if (discounted(price, TIERS[i].discountPct) >= liquidationFloor) {
      chosen = TIERS[i];
    }
  }

  return {
    tier: chosen.tier,
    discountPct: chosen.discountPct,
    discountedPrice: discounted(price, chosen.discountPct),
  };
}
