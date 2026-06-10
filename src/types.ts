// Shared domain types for the deterministic markdown pipeline.
// The `Candidate` shape is the feature's externally-observable contract
// (pipeline.test.ts is @frozen against it); later features recompute against
// this same shape, so field names here are load-bearing.

/**
 * A Color Choice (CC): one sellable color of a women's-shoes style — a customer's
 * choice of style + color, one level finer than the plain item but not down to size.
 */
export interface CC {
  id: string;
  name: string;
  price: number;
  liquidationFloor: number;
  weeksTotal: number;
  weeksElapsed: number;
  weeksRemaining: number;
  inventoryUnits: number;
  /** Cumulative planned sell-through fraction per week; non-decreasing, ends ≈1.0. */
  planCurve: number[];
  /** Actual cumulative sell-through fraction at the current week, in [0, 1]. */
  actualCumulativeFraction: number;
  /**
   * Observed weekly cumulative actual sell-through to date (Feature 3): one entry
   * per elapsed week (`length === weeksElapsed`), non-decreasing in [0, 1], with the
   * last entry equal to `actualCumulativeFraction`. Covers observed weeks only — no
   * future actuals. The trajectory the reason classifier reads to tell *why* a CC is
   * behind. Optional so hand-built/legacy fixtures may omit it; the generator always
   * emits it. Absent it, the trajectory archetypes are simply unavailable.
   */
  actualCurve?: number[];
}

/** The three markdown tiers, with their fixed discount percentages. */
export type Tier = 'First' | 'Second' | 'Clearance';

/**
 * The single named diagnosis attached to a candidate (Feature 3). Chosen from a
 * fixed, small vocabulary by the urgency-first priority
 * `seasonal-cliff > inventory-depth > decelerating > never-started > behind-plan`.
 */
export type ReasonArchetype =
  | 'seasonal-cliff'
  | 'inventory-depth'
  | 'decelerating'
  | 'never-started'
  | 'behind-plan';

/**
 * The health status of a non-candidate CC — the on/ahead side of the partition, given
 * the same named treatment as the candidate `ReasonArchetype` so the on/ahead section
 * reads with equal weight (presentation-only; the engine never classifies these).
 * `ahead` = ahead of the plan checkpoint; `on-plan` = tracking it within rounding;
 * `on-track` = behind it but inside the flag tolerance, so not yet a candidate.
 */
export type HealthArchetype = 'ahead' | 'on-plan' | 'on-track';

export interface Evaluation {
  /** plannedCumulativeFractionNow − actualCumulativeFractionNow. Positive = behind. */
  gap: number;
  /**
   * Compound ordering score (Feature 3): a non-decreasing function of the gap
   * magnitude, amplified by cliff proximity (fewer weeks remaining) and inventory
   * depth (units per remaining week). Finite and ≥ 0. This is the candidate ranking
   * key — it does NOT feed the tier (see `tierMagnitude`).
   */
  severity: number;
  /**
   * `max(gap, 0)` — the gap-driven magnitude the tier recommender consumes (Feature
   * 1's old `severity`). Kept separate from compound `severity` so the discount tier
   * stays gap-driven and urgency-invariant.
   */
  tierMagnitude: number;
  flagged: boolean;
  weeksRemaining: number;
}

export interface Recommendation {
  tier: Tier;
  discountPct: number;
  discountedPrice: number;
}

/**
 * A CC that is not a markdown candidate (on plan, ahead, or behind but below the
 * flag threshold). Carries enough to render and to re-edit into candidacy, but no
 * tier or explanation — it isn't a markdown call. `gapPoints` mirrors the
 * `Candidate` field (round(gap × 100)) and can be negative when ahead of plan.
 */
export interface NonCandidate {
  id: string;
  name: string;
  price: number;
  gapPoints: number;
  weeksRemaining: number;
  flagged: false;
}

/** The whole-class recompute: a total, disjoint partition of the input CCs. */
export interface ClassEvaluation {
  candidates: Candidate[];
  nonCandidates: NonCandidate[];
}

/** One row on the candidate surface. */
export interface Candidate {
  id: string;
  name: string;
  price: number;
  liquidationFloor: number;
  /** Compound ordering severity (Feature 3): candidates are sorted by this, descending. */
  severity: number;
  weeksRemaining: number;
  /** round(gap × 100) — integer "points behind plan". */
  gapPoints: number;
  tier: Tier;
  discountPct: number;
  discountedPrice: number;
  /**
   * The named reason archetype for this candidate (Feature 3). Optional in the type
   * only so existing hand-built fixtures still type-check; pipeline/recompute output
   * always populates it. The reason also rides in `explanation`'s phrasing.
   */
  reason?: ReasonArchetype;
  explanation: string;
}
