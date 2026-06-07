// Shared domain types for the deterministic markdown pipeline.
// The `Candidate` shape is the feature's externally-observable contract
// (pipeline.test.ts is @frozen against it); later features recompute against
// this same shape, so field names here are load-bearing.

/** A color-colorway: one sellable variant of a women's-shoes style. */
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
}

/** The three markdown tiers, with their fixed discount percentages. */
export type Tier = 'First' | 'Second' | 'Clearance';

export interface Evaluation {
  /** plannedCumulativeFractionNow − actualCumulativeFractionNow. Positive = behind. */
  gap: number;
  /** Non-decreasing in gap. Basic model: max(gap, 0). */
  severity: number;
  flagged: boolean;
  weeksRemaining: number;
}

export interface Recommendation {
  tier: Tier;
  discountPct: number;
  discountedPrice: number;
}

/** One row on the candidate surface. */
export interface Candidate {
  id: string;
  name: string;
  price: number;
  liquidationFloor: number;
  severity: number;
  weeksRemaining: number;
  /** round(gap × 100) — integer "points behind plan". */
  gapPoints: number;
  tier: Tier;
  discountPct: number;
  discountedPrice: number;
  explanation: string;
}
