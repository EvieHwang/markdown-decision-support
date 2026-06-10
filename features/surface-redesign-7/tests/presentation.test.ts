// @frozen for the engine-facing contracts (R9): every ReasonArchetype the engine can emit has
// a presentation label so no reason renders unlabeled; every Tier's presentation discount %
// equals the engine's number (the copy layer can never disagree with the engine); and
// `baseTierIndex` is exported from tier.ts as a pure magnitude→index function consistent with
// `recommendTier` (the floor only ever caps to a shallower tier). @scaffolding for the META
// object SHAPE (field names) — /build may refine the container so long as these hold.
import { describe, it, expect } from 'vitest';
import { REASON_META, TIER_META } from '@/presentation';
import { baseTierIndex, recommendTier } from '@/tier';
import { evaluate } from '@/engine';
import { generateProductClass } from '@/data';
import type { ReasonArchetype, Tier } from '@/types';

const ARCHETYPES: ReasonArchetype[] = [
  'seasonal-cliff',
  'inventory-depth',
  'decelerating',
  'never-started',
  'behind-plan',
];
const TIERS: Tier[] = ['First', 'Second', 'Clearance'];
const TIER_INDEX: Record<Tier, number> = { First: 0, Second: 1, Clearance: 2 };

describe('presentation copy layer', () => {
  it('labels every reason archetype the engine can produce', () => {
    for (const reason of ARCHETYPES) {
      const meta = REASON_META[reason];
      expect(meta, `REASON_META missing ${reason}`).toBeTruthy();
      expect(String(meta.label).length).toBeGreaterThan(0);
      expect(String(meta.rule).length).toBeGreaterThan(0);
    }
  });

  it('keeps every tier’s presentation discount % equal to the engine’s number', () => {
    // Drive recommendTier into each tier with a price/floor that never triggers the cap,
    // and confirm TIER_META agrees with the engine's percentage for the tier chosen.
    const cases: { magnitude: number; tier: Tier }[] = [
      { magnitude: 0.0, tier: 'First' },
      { magnitude: 0.2, tier: 'Second' },
      { magnitude: 0.5, tier: 'Clearance' },
    ];
    for (const { magnitude, tier } of cases) {
      const rec = recommendTier({ severity: magnitude, price: 100, liquidationFloor: 0 });
      expect(rec.tier).toBe(tier); // sanity: uncapped, magnitude lands on the expected tier
      expect(TIER_META[rec.tier].discountPct).toBe(rec.discountPct);
    }
  });

  it('exposes a tier note for every tier', () => {
    for (const tier of TIERS) {
      expect(TIER_META[tier]).toBeTruthy();
      expect(String(TIER_META[tier].note).length).toBeGreaterThan(0);
    }
  });
});

describe('baseTierIndex (the one engine export)', () => {
  it('is a pure, non-decreasing magnitude→index function in {0,1,2}', () => {
    const samples = [0, 0.05, 0.14, 0.15, 0.2, 0.29, 0.3, 0.6];
    let prev = -1;
    for (const m of samples) {
      const idx = baseTierIndex(m);
      expect([0, 1, 2]).toContain(idx);
      expect(idx).toBeGreaterThanOrEqual(prev); // non-decreasing
      prev = idx;
    }
    // purity: same input, same output, no side effects
    expect(baseTierIndex(0.2)).toBe(baseTierIndex(0.2));
  });

  it('is consistent with recommendTier: the chosen tier is never deeper than the base', () => {
    // Across a real generated class, the engine's chosen tier index must be ≤ the
    // severity-indicated base index — the floor only ever caps to a SHALLOWER tier.
    for (const seed of [1, 7, 42, 100, 2024]) {
      for (const cc of generateProductClass(seed)) {
        const ev = evaluate(cc);
        const rec = recommendTier({
          severity: ev.tierMagnitude,
          price: cc.price,
          liquidationFloor: cc.liquidationFloor,
        });
        expect(TIER_INDEX[rec.tier]).toBeLessThanOrEqual(baseTierIndex(ev.tierMagnitude));
      }
    }
  });
});
