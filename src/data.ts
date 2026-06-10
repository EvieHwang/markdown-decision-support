import type { CC, ReasonArchetype, Tier } from '@/types';
import { earlyCheckpointIndex } from '@/engine';

// Seedable PRNG (mulberry32): deterministic, so the same seed reproduces the
// exact same class. Pure function of its internal state — no Math.random. Only
// the *cosmetic* fields (names, prices, the in-band gap pick) are seed-driven;
// the coverage matrix below is fixed, so every class shows the same balanced
// spread of statuses while still differing class-to-class.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small women's-shoes vocabulary to compose plausible CC names from.
const STYLES = [
  'Aria Pump',
  'Marlow Loafer',
  'Vesper Sandal',
  'Juno Bootie',
  'Cleo Mule',
  'Indra Flat',
  'Soraya Heel',
  'Wren Sneaker',
  'Lottie Slingback',
  'Posy Espadrille',
  'Fable Oxford',
  'Dune Wedge',
];
const COLORS = ['Black', 'Bone', 'Cognac', 'Merlot', 'Sage', 'Ink', 'Blush', 'Stone'];

const WEEKS_TOTAL = 12;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * A retail-conventional price: snapped to the nearest value ending in `…4.99`
 * or `…9.99` (the ladder 39.99, 44.99, 49.99, … spaced five apart). Buyers expect
 * a charm price, not the pure `$137.42` a raw draw produces.
 */
function snapPrice(raw: number): number {
  return Math.round((raw - 4.99) / 5) * 5 + 4.99;
}

/** The full-season plan: a simple linear cumulative curve, pinned to 1.0 at the end. */
function linearPlan(): number[] {
  const curve: number[] = [];
  for (let w = 0; w < WEEKS_TOTAL; w++) curve.push(round4((w + 1) / WEEKS_TOTAL));
  curve[WEEKS_TOTAL - 1] = 1.0;
  return curve;
}

/**
 * A "never-started" observed actual curve: essentially no sell-through in the
 * opening weeks, then a late ramp up to `target`. Sits well behind plan at the
 * early checkpoint, so the classifier reads it as never-started.
 */
function buildNeverStartedCurve(weeksElapsed: number, target: number): number[] {
  const curve = new Array<number>(weeksElapsed).fill(0);
  for (let w = 2; w < weeksElapsed; w++) {
    curve[w] = round4((target * (w - 1)) / (weeksElapsed - 2));
  }
  curve[weeksElapsed - 1] = target;
  return curve;
}

/**
 * A "decelerating" observed actual curve: tracks the plan exactly through the
 * early checkpoint, then ramps slowly to `target` (the stall level). It was
 * on-track early but is behind now, so the classifier reads it as decelerating.
 * `target` must be ≥ the plan at the early checkpoint so the curve stays
 * non-decreasing — the coverage matrix guarantees this.
 */
function buildDeceleratingCurve(weeksElapsed: number, planCurve: number[], target: number): number[] {
  const idx = Math.min(earlyCheckpointIndex(weeksElapsed), weeksElapsed - 1);
  const start = planCurve[idx];
  const steps = Math.max(weeksElapsed - 1 - idx, 1);
  const curve = new Array<number>(weeksElapsed);
  for (let w = 0; w < weeksElapsed; w++) {
    curve[w] = w <= idx ? planCurve[w] : round4(start + (target - start) * ((w - idx) / steps));
  }
  curve[weeksElapsed - 1] = target;
  return curve;
}

/**
 * A generic non-decreasing observed actual curve rising steadily to `target` — the
 * default shape for CCs whose reason doesn't depend on the trajectory (seasonal
 * cliff, inventory depth, and the on/ahead non-candidates).
 */
function buildRampCurve(weeksElapsed: number, target: number): number[] {
  const curve = new Array<number>(weeksElapsed);
  for (let w = 0; w < weeksElapsed; w++) {
    curve[w] = round4((target * (w + 1)) / weeksElapsed);
  }
  curve[weeksElapsed - 1] = target;
  return curve;
}

type CurveShape = 'ramp' | 'never-started' | 'decelerating';

/**
 * One slot in the fixed coverage matrix. A `reason`+`tier` slot targets a behind-plan
 * candidate of that archetype and markdown tier; a `health` slot targets a non-candidate
 * at that distance from plan (negative gap = ahead). `weeksElapsed`, `inventoryUnits`,
 * `floorRatio` and `curve` are chosen so the engine actually classifies the slot as
 * intended (see the per-slot notes), independent of the seed.
 *
 * Coverage: every reason the generator can *reach* — seasonal-cliff, inventory-depth,
 * never-started, decelerating — appears, spread across First / Second / Clearance, plus
 * on/ahead non-candidates. (`behind-plan` is the no-trajectory fallback and is
 * unreachable once a CC carries an actual curve, which every generated CC does.)
 */
interface Slot {
  reason?: Exclude<ReasonArchetype, 'behind-plan'>;
  tier?: Tier;
  health?: number; // signed target gap for a non-candidate (≤ flag threshold)
  weeksElapsed: number;
  inventoryUnits: number;
  floorRatio: number;
  curve: CurveShape;
}

// In-band gap magnitudes per tier; one is picked per slot by the seed so the same
// matrix yields different markdown depths (and severities) class-to-class while every
// gap stays safely inside its tier band (away from the 0.15 / 0.30 boundaries).
const TIER_GAP: Record<Tier, number[]> = {
  First: [0.08, 0.1, 0.12],
  Second: [0.18, 0.22, 0.26],
  Clearance: [0.32, 0.37, 0.42],
};

const MATRIX: Slot[] = [
  // — seasonal-cliff (weeksRemaining ≤ 2 ⇒ cliff wins regardless of trajectory) —
  { reason: 'seasonal-cliff', tier: 'Clearance', weeksElapsed: 10, inventoryUnits: 220, floorRatio: 0.55, curve: 'ramp' },
  { reason: 'seasonal-cliff', tier: 'First', weeksElapsed: 10, inventoryUnits: 200, floorRatio: 0.7, curve: 'ramp' },
  // — inventory-depth (units / weeksRemaining ≥ 300, no cliff ⇒ depth wins) —
  { reason: 'inventory-depth', tier: 'Second', weeksElapsed: 7, inventoryUnits: 1650, floorRatio: 0.6, curve: 'ramp' },
  { reason: 'inventory-depth', tier: 'Clearance', weeksElapsed: 7, inventoryUnits: 1800, floorRatio: 0.5, curve: 'ramp' },
  // — never-started (behind plan from the opening weeks) —
  { reason: 'never-started', tier: 'Clearance', weeksElapsed: 8, inventoryUnits: 320, floorRatio: 0.5, curve: 'never-started' },
  { reason: 'never-started', tier: 'First', weeksElapsed: 7, inventoryUnits: 240, floorRatio: 0.7, curve: 'never-started' },
  // — decelerating (tracked plan early, then stalled) —
  { reason: 'decelerating', tier: 'Second', weeksElapsed: 8, inventoryUnits: 260, floorRatio: 0.6, curve: 'decelerating' },
  { reason: 'decelerating', tier: 'First', weeksElapsed: 8, inventoryUnits: 250, floorRatio: 0.7, curve: 'decelerating' },
  // — on / ahead of plan (non-candidates: gap ≤ flag threshold) —
  { health: -0.12, weeksElapsed: 7, inventoryUnits: 180, floorRatio: 0.6, curve: 'ramp' },
  { health: 0.0, weeksElapsed: 7, inventoryUnits: 200, floorRatio: 0.6, curve: 'ramp' },
  { health: 0.04, weeksElapsed: 7, inventoryUnits: 210, floorRatio: 0.6, curve: 'ramp' },
  { health: -0.13, weeksElapsed: 8, inventoryUnits: 190, floorRatio: 0.6, curve: 'ramp' },
];

/**
 * Generates one synthetic women's-shoes product class with an even spread of statuses.
 *
 * Deterministic in `seed`: the same seed reproduces the exact same class, and different
 * seeds differ (names, prices, and the in-band gap pick all vary). Every CC carries a
 * non-decreasing observed `actualCurve` (length === `weeksElapsed`, last entry === the
 * current scalar). The fixed coverage matrix guarantees the class always contains
 * behind-plan candidates across every reachable reason and tier *and* on/ahead
 * non-candidates, so the surface always has something to demonstrate on both sides.
 */
export function generateProductClass(seed: number): CC[] {
  const rng = mulberry32(seed);
  const planCurve = linearPlan();
  const styleStart = Math.floor(rng() * STYLES.length);
  const colorStart = Math.floor(rng() * COLORS.length);

  return MATRIX.map((slot, i) => {
    const we = slot.weeksElapsed;
    const weeksRemaining = WEEKS_TOTAL - we;
    const plannedNow = planCurve[we - 2];

    // The targeted gap: an in-band magnitude for a candidate, or the fixed signed
    // distance for a non-candidate. acf = plannedNow − gap.
    const gap =
      slot.health !== undefined ? slot.health : TIER_GAP[slot.tier!][Math.floor(rng() * 3)];
    const actualCumulativeFraction = round4(Math.max(0, Math.min(1, plannedNow - gap)));

    let actualCurve: number[];
    if (slot.curve === 'never-started') {
      actualCurve = buildNeverStartedCurve(we, actualCumulativeFraction);
    } else if (slot.curve === 'decelerating') {
      actualCurve = buildDeceleratingCurve(we, planCurve, actualCumulativeFraction);
    } else {
      actualCurve = buildRampCurve(we, actualCumulativeFraction);
    }

    const price = snapPrice(40 + rng() * 150); // ~$40–$190, charm-priced
    const liquidationFloor = round2(price * slot.floorRatio);
    const style = STYLES[(styleStart + i) % STYLES.length];
    const color = COLORS[(colorStart + i * 3) % COLORS.length];

    return {
      id: `cc-${i}`,
      name: `${style} — ${color}`,
      price,
      liquidationFloor,
      weeksTotal: WEEKS_TOTAL,
      weeksElapsed: we,
      weeksRemaining,
      inventoryUnits: slot.inventoryUnits,
      planCurve,
      actualCumulativeFraction,
      actualCurve,
    };
  });
}
