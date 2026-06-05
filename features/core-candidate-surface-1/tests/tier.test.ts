// @scaffolding — recommendTier's name/shape is a provisional seam. The behaviors are
// the contract: the fixed tier set, the floor cap (never breach the floor), and
// monotonicity of tier in severity with price/floor held fixed.
import { describe, it, expect } from 'vitest';
import { recommendTier } from '@/tier';

const PCT: Record<string, number> = { First: 15, Second: 25, Clearance: 40 };

describe('recommendTier — markdown tier recommender', () => {
  it('returns one of the three tiers with its fixed percentage', () => {
    const r = recommendTier({ severity: 0.5, price: 100, liquidationFloor: 50 });
    expect(Object.keys(PCT)).toContain(r.tier);
    expect(r.discountPct).toBe(PCT[r.tier]);
  });

  it('discounted price equals price reduced by the tier percentage', () => {
    const r = recommendTier({ severity: 0.5, price: 200, liquidationFloor: 100 });
    expect(r.discountedPrice).toBeCloseTo(200 * (1 - r.discountPct / 100), 6);
  });

  it('never recommends a discounted price below the liquidation floor', () => {
    // floor of 78 on a 100 price: Clearance (60) and Second (75) breach it; only First (85) fits.
    const r = recommendTier({ severity: 0.99, price: 100, liquidationFloor: 78 });
    expect(r.discountedPrice).toBeGreaterThanOrEqual(78);
    expect(r.tier).toBe('First');
  });

  it('caps to the deepest tier the floor allows rather than the severity-indicated one', () => {
    // floor of 70 on a 100 price: Clearance (60) breaches; Second (75) fits.
    const r = recommendTier({ severity: 0.99, price: 100, liquidationFloor: 70 });
    expect(r.discountedPrice).toBeGreaterThanOrEqual(70);
    expect(r.tier).toBe('Second');
  });

  it('allows the deepest tier when the floor leaves room', () => {
    const r = recommendTier({ severity: 0.99, price: 100, liquidationFloor: 40 });
    expect(r.tier).toBe('Clearance');
  });

  it('is monotonic: with price and floor fixed, more severity never returns a shallower tier', () => {
    const rank: Record<string, number> = { First: 0, Second: 1, Clearance: 2 };
    const lo = recommendTier({ severity: 0.06, price: 100, liquidationFloor: 30 });
    const mid = recommendTier({ severity: 0.2, price: 100, liquidationFloor: 30 });
    const hi = recommendTier({ severity: 0.5, price: 100, liquidationFloor: 30 });
    expect(rank[mid.tier]).toBeGreaterThanOrEqual(rank[lo.tier]);
    expect(rank[hi.tier]).toBeGreaterThanOrEqual(rank[mid.tier]);
  });
});
