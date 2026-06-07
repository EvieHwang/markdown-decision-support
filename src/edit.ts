import type { CC } from '@/types';

/**
 * Clamped inline edit of one scalar input on a CC (Feature 2 — Live Customization).
 *
 * Pure: returns a new CC, leaving the input untouched. Changes only the targeted
 * field — except `weeksElapsed`, which is coupled to `weeksRemaining` (they always
 * sum to `weeksTotal`), so editing one updates the other.
 *
 * Every edit is clamped to the range that preserves F1's full generator invariant
 * set, computed from the CC's *current other values* so no single edit can violate
 * an invariant. The partner field is never silently rewritten — a cross-field
 * conflict clamps the field being edited, not its partner. A non-finite or empty
 * value is a no-op (returns the CC unchanged), so NaN/Infinity never lands in a CC.
 */

// F1 contract: liquidationFloor ≤ price × 0.85 (so the First tier's discounted
// price always clears the floor). Both clamps below derive from this ratio.
const FLOOR_RATIO = 0.85;

// The floor's range is the open interval (0, price × 0.85]; a small positive
// lower bound stands in for the excluded 0 so the floor is always strictly > 0.
const MIN_FLOOR = 0.01;

export type EditableField =
  | 'actualCumulativeFraction'
  | 'price'
  | 'liquidationFloor'
  | 'weeksElapsed';

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

export function applyEdit(cc: CC, field: EditableField, value: number): CC {
  // Bad input (NaN/Infinity, or an empty field parsed to NaN) leaves the CC as-is.
  if (!Number.isFinite(value)) return cc;

  switch (field) {
    case 'actualCumulativeFraction':
      return { ...cc, actualCumulativeFraction: clamp(value, 0, 1) };

    case 'price':
      // Raise price as needed so the existing floor still fits under price × 0.85
      // (and stays strictly positive). The floor itself is left untouched.
      return { ...cc, price: Math.max(value, cc.liquidationFloor / FLOOR_RATIO) };

    case 'liquidationFloor':
      return { ...cc, liquidationFloor: clamp(value, MIN_FLOOR, cc.price * FLOOR_RATIO) };

    case 'weeksElapsed': {
      const weeksElapsed = clamp(Math.round(value), 1, cc.weeksTotal - 1);
      return { ...cc, weeksElapsed, weeksRemaining: cc.weeksTotal - weeksElapsed };
    }

    default:
      return cc;
  }
}
