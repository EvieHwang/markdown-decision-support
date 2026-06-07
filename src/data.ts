import type { CC } from '@/types';

// Seedable PRNG (mulberry32): deterministic, so the same seed reproduces the
// exact same class. Pure function of its internal state — no Math.random.
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

/** Build a non-decreasing cumulative plan curve that ends exactly at 1.0. */
function buildPlanCurve(rng: () => number, weeks: number): number[] {
  const increments: number[] = [];
  let sum = 0;
  for (let w = 0; w < weeks; w++) {
    // Strictly positive weekly increments → strictly increasing cumulative curve.
    const inc = 0.5 + rng();
    increments.push(inc);
    sum += inc;
  }
  let cum = 0;
  const curve = increments.map((inc) => {
    cum += inc;
    return cum / sum;
  });
  // Pin the final point to exactly 1.0 (guards against float drift).
  curve[curve.length - 1] = 1.0;
  return curve;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Generates one synthetic women's-shoes product class (≥ 8 CCs).
 *
 * Deterministic in `seed`. Guarantees the invariants the rest of the pipeline
 * relies on: positive floor at or below 85% of price (First tier always fits),
 * a non-decreasing plan curve ending ≈ 1.0, coherent mid-season weeks, and at
 * least one CC behind plan so the skeleton always has something to surface.
 */
export function generateProductClass(seed: number): CC[] {
  const rng = mulberry32(seed);
  const count = 8 + Math.floor(rng() * 5); // 8..12 CCs

  const ccs: CC[] = [];
  for (let i = 0; i < count; i++) {
    const style = STYLES[Math.floor(rng() * STYLES.length)];
    const color = COLORS[Math.floor(rng() * COLORS.length)];

    const price = round2(60 + rng() * 100); // $60..$160
    // Floor between 45% and 80% of price — strictly within the ≤ 85% guarantee.
    const liquidationFloor = round2(price * (0.45 + rng() * 0.35));

    const weeksElapsed = 5 + Math.floor(rng() * 5); // 5..9 (≥ 2 for the engine index)
    const weeksRemaining = WEEKS_TOTAL - weeksElapsed; // 3..7, always ≥ 1
    const planCurve = buildPlanCurve(rng, WEEKS_TOTAL);

    // The engine compares actual against the plan checkpoint at index
    // weeksElapsed-2. Force the first two CCs behind plan (so there is always
    // something to surface); the rest split behind / on-or-ahead by the seed.
    const planRef = planCurve[weeksElapsed - 2];
    const behind = i < 2 ? true : rng() < 0.5;

    let actualCumulativeFraction: number;
    if (behind) {
      // 8..32 points behind the reference checkpoint → comfortably over the
      // flag threshold and spread across severities.
      const deficit = 0.08 + rng() * 0.24;
      actualCumulativeFraction = round2(Math.max(0, planRef - deficit));
    } else {
      // On or ahead of plan: at least the current-week plan, never flagged.
      const planNow = planCurve[weeksElapsed - 1];
      const surplus = rng() * 0.06;
      actualCumulativeFraction = round2(Math.min(1, planNow + surplus));
    }

    ccs.push({
      id: `cc-${i}`,
      name: `${style} — ${color}`,
      price,
      liquidationFloor,
      weeksTotal: WEEKS_TOTAL,
      weeksElapsed,
      weeksRemaining,
      inventoryUnits: Math.floor(20 + rng() * 480),
      planCurve,
      actualCumulativeFraction,
    });
  }

  return ccs;
}
