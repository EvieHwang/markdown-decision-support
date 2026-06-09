/* ============================================================================
 * Markdown Decision Support — deterministic engine
 * Faithful 1:1 port of the project's TypeScript core (data / engine / tier /
 * explanation / trajectory / edit / pipeline). No AI, no randomness beyond a
 * seedable PRNG. Same seed + same edits => same output, byte for byte.
 * Exposed as a single global: window.MDS
 * ========================================================================== */
(function () {
  'use strict';

  // ---- PRNG (mulberry32) --------------------------------------------------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- vocabulary ---------------------------------------------------------
  const STYLES = [
    'Aria Pump', 'Marlow Loafer', 'Vesper Sandal', 'Juno Bootie',
    'Cleo Mule', 'Indra Flat', 'Soraya Heel', 'Wren Sneaker',
    'Lottie Slingback', 'Posy Espadrille', 'Fable Oxford', 'Dune Wedge',
  ];
  const COLORS = ['Black', 'Bone', 'Cognac', 'Merlot', 'Sage', 'Ink', 'Blush', 'Stone'];
  const WEEKS_TOTAL = 12;

  // ---- engine constants ---------------------------------------------------
  const FLAG_THRESHOLD = 0.05;
  const CLIFF_GAIN = 2;
  const INVENTORY_GAIN = 0.001;
  const CLIFF_WEEKS = 2;
  const INVENTORY_PRESSURE = 300;

  const TIERS = [
    { tier: 'First', discountPct: 15 },
    { tier: 'Second', discountPct: 25 },
    { tier: 'Clearance', discountPct: 40 },
  ];
  const FLOOR_RATIO = 0.85;
  const MIN_FLOOR = 0.01;

  function round2(n) { return Math.round(n * 100) / 100; }
  function round1(n) { return Math.round(n * 10) / 10; }

  // ---- curve builders -----------------------------------------------------
  function buildPlanCurve(rng, weeks) {
    const increments = [];
    let sum = 0;
    for (let w = 0; w < weeks; w++) {
      const inc = 0.5 + rng();
      increments.push(inc);
      sum += inc;
    }
    let cum = 0;
    const curve = increments.map((inc) => { cum += inc; return cum / sum; });
    curve[curve.length - 1] = 1.0;
    return curve;
  }

  function earlyCheckpointIndex(weeksElapsed) {
    return Math.max(0, Math.min(Math.floor(weeksElapsed / 3), weeksElapsed - 1));
  }

  function buildNeverStartedCurve(weeksElapsed, target) {
    const curve = new Array(weeksElapsed).fill(0);
    for (let w = 2; w < weeksElapsed; w++) {
      curve[w] = (target * (w - 1)) / (weeksElapsed - 2);
    }
    curve[weeksElapsed - 1] = target;
    return curve;
  }

  function buildDeceleratingCurve(weeksElapsed, planCurve) {
    const idx = earlyCheckpointIndex(weeksElapsed);
    const target = planCurve[idx];
    const curve = new Array(weeksElapsed);
    for (let w = 0; w < weeksElapsed; w++) {
      curve[w] = w <= idx ? planCurve[w] : target;
    }
    curve[weeksElapsed - 1] = target;
    return { curve, target };
  }

  function buildRampCurve(weeksElapsed, target) {
    const curve = new Array(weeksElapsed);
    for (let w = 0; w < weeksElapsed; w++) {
      curve[w] = (target * (w + 1)) / weeksElapsed;
    }
    curve[weeksElapsed - 1] = target;
    return curve;
  }

  // ---- synthetic data generator ------------------------------------------
  function generateProductClass(seed) {
    const rng = mulberry32(seed);
    const count = 8 + Math.floor(rng() * 5); // 8..12

    const ccs = [];
    for (let i = 0; i < count; i++) {
      const style = STYLES[Math.floor(rng() * STYLES.length)];
      const color = COLORS[Math.floor(rng() * COLORS.length)];

      const price = round2(60 + rng() * 100);
      const liquidationFloor = round2(price * (0.45 + rng() * 0.35));

      const weeksElapsed = 5 + Math.floor(rng() * 5); // 5..9
      const weeksRemaining = WEEKS_TOTAL - weeksElapsed;
      const planCurve = buildPlanCurve(rng, WEEKS_TOTAL);

      const planRef = planCurve[weeksElapsed - 2];
      const behind = i < 2 ? true : rng() < 0.5;

      let actualCumulativeFraction;
      if (behind) {
        const deficit = 0.08 + rng() * 0.24;
        actualCumulativeFraction = round2(Math.max(0, planRef - deficit));
      } else {
        const planNow = planCurve[weeksElapsed - 1];
        const surplus = rng() * 0.06;
        actualCumulativeFraction = round2(Math.min(1, planNow + surplus));
      }

      const inventoryUnits = Math.floor(20 + rng() * 480);
      let actualCurve;
      if (i === 0) {
        actualCurve = buildNeverStartedCurve(weeksElapsed, actualCumulativeFraction);
      } else if (i === 1) {
        const dec = buildDeceleratingCurve(weeksElapsed, planCurve);
        actualCurve = dec.curve;
        actualCumulativeFraction = dec.target;
      } else {
        actualCurve = buildRampCurve(weeksElapsed, actualCumulativeFraction);
      }

      ccs.push({
        id: `cc-${i}`,
        name: `${style} — ${color}`,
        price, liquidationFloor,
        weeksTotal: WEEKS_TOTAL,
        weeksElapsed, weeksRemaining,
        inventoryUnits, planCurve,
        actualCumulativeFraction, actualCurve,
      });
    }
    return ccs;
  }

  // ---- engine (evaluate) --------------------------------------------------
  function plannedNow(cc) {
    const idx = Math.min(Math.max(cc.weeksElapsed - 2, 0), cc.planCurve.length - 1);
    return cc.planCurve[idx];
  }

  function evaluate(cc) {
    const gap = plannedNow(cc) - cc.actualCumulativeFraction;
    const tierMagnitude = Math.max(gap, 0);
    const weeksRemaining = cc.weeksRemaining;

    const safeWeeks = Math.max(weeksRemaining, 1);
    const cliffFactor = CLIFF_GAIN / safeWeeks;
    const inventoryFactor = INVENTORY_GAIN * (Math.max(cc.inventoryUnits, 0) / safeWeeks);
    const severity = tierMagnitude * (1 + cliffFactor + inventoryFactor);

    const flagged = gap > FLAG_THRESHOLD;
    return { gap, severity, tierMagnitude, flagged, weeksRemaining };
  }

  // ---- tier recommender ---------------------------------------------------
  function baseTierIndex(severity) {
    if (severity >= 0.3) return 2;
    if (severity >= 0.15) return 1;
    return 0;
  }
  function discounted(price, discountPct) { return price * (1 - discountPct / 100); }

  function recommendTier({ severity, price, liquidationFloor }) {
    const baseIdx = baseTierIndex(severity);
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

  // ---- explanation / reason classifier -----------------------------------
  function earlyGap(cc) {
    const curve = cc.actualCurve;
    if (!curve || curve.length === 0) return null;
    const idx = Math.min(
      earlyCheckpointIndex(cc.weeksElapsed),
      curve.length - 1,
      cc.planCurve.length - 1,
    );
    return cc.planCurve[idx] - curve[idx];
  }

  function currentGap(cc) {
    const idx = Math.min(Math.max(cc.weeksElapsed - 2, 0), cc.planCurve.length - 1);
    return cc.planCurve[idx] - cc.actualCumulativeFraction;
  }

  function classifyReason(cc) {
    if (cc.weeksRemaining <= CLIFF_WEEKS) return 'seasonal-cliff';
    const safeWeeks = Math.max(cc.weeksRemaining, 1);
    if (cc.inventoryUnits / safeWeeks >= INVENTORY_PRESSURE) return 'inventory-depth';
    const early = earlyGap(cc);
    if (early !== null) {
      if (early > FLAG_THRESHOLD) return 'never-started';
      if (currentGap(cc) > FLAG_THRESHOLD) return 'decelerating';
    }
    return 'behind-plan';
  }

  function composeExplanation(cc, evaluation, recommendation) {
    const reason = classifyReason(cc);
    const gapPoints = Math.round(evaluation.gap * 100);
    const wks = evaluation.weeksRemaining;
    const suggest = `suggest ${recommendation.tier} (${recommendation.discountPct}% off)`;
    switch (reason) {
      case 'never-started':
        return `${cc.name}: never got going — ${gapPoints} pts behind plan from the start, ${wks} wks left — ${suggest}.`;
      case 'decelerating':
        return `${cc.name}: lost momentum — tracked plan early then stalled, now ${gapPoints} pts behind, ${wks} wks left — ${suggest}.`;
      case 'seasonal-cliff':
        return `${cc.name}: running out of runway — only ${wks} wks left to clear a ${gapPoints} pts shortfall — ${suggest}.`;
      case 'inventory-depth':
        return `${cc.name}: stock piling up — ${gapPoints} pts behind plan with heavy inventory and ${wks} wks left — ${suggest}.`;
      case 'behind-plan':
      default:
        return `${cc.name}: ${gapPoints} pts behind plan, ${wks} wks left — ${suggest}.`;
    }
  }

  // ---- trajectory ---------------------------------------------------------
  function buildTrajectory(cc) {
    const plan = cc.planCurve.map((value, i) => ({ week: i + 1, value }));
    const recorded = cc.actualCurve || [];
    const observedCount = Math.min(cc.weeksElapsed, recorded.length);
    const observedActual = recorded.slice(0, observedCount).map((value, i) => ({ week: i + 1, value }));
    const livePoint = { week: cc.weeksElapsed, value: cc.actualCumulativeFraction };
    const observedAtLive = observedActual.find((p) => p.week === livePoint.week);
    const divergent = observedActual.length > 0 &&
      (observedAtLive === undefined || observedAtLive.value !== livePoint.value);
    return { plan, observedActual, livePoint, divergent };
  }

  // ---- inline edit --------------------------------------------------------
  function clamp(value, lo, hi) { return Math.min(Math.max(value, lo), hi); }

  function applyEdit(cc, field, value) {
    if (!Number.isFinite(value)) return cc;
    switch (field) {
      case 'actualCumulativeFraction':
        return { ...cc, actualCumulativeFraction: clamp(value, 0, 1) };
      case 'price':
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

  // ---- pipeline -----------------------------------------------------------
  function toCandidate(cc, evaluation) {
    const recommendation = recommendTier({
      severity: evaluation.tierMagnitude,
      price: cc.price,
      liquidationFloor: cc.liquidationFloor,
    });
    return {
      id: cc.id,
      name: cc.name,
      price: cc.price,
      liquidationFloor: cc.liquidationFloor,
      severity: evaluation.severity,
      weeksRemaining: evaluation.weeksRemaining,
      gapPoints: Math.round(evaluation.gap * 100),
      tier: recommendation.tier,
      discountPct: recommendation.discountPct,
      discountedPrice: recommendation.discountedPrice,
      reason: classifyReason(cc),
      explanation: composeExplanation(cc, evaluation, recommendation),
    };
  }

  function evaluateClass(ccs) {
    const candidates = [];
    const nonCandidates = [];
    for (const cc of ccs) {
      const evaluation = evaluate(cc);
      if (evaluation.flagged) {
        candidates.push(toCandidate(cc, evaluation));
      } else {
        nonCandidates.push({
          id: cc.id,
          name: cc.name,
          price: cc.price,
          gapPoints: Math.round(evaluation.gap * 100),
          weeksRemaining: evaluation.weeksRemaining,
          flagged: false,
        });
      }
    }
    candidates.sort((a, b) => b.severity - a.severity);
    return { candidates, nonCandidates };
  }

  // ---- reason metadata (presentation; rules paraphrased from the engine) --
  const REASON_META = {
    'seasonal-cliff': {
      label: 'seasonal cliff',
      kind: 'danger',
      rule: `≤ ${CLIFF_WEEKS} weeks of runway remain. Highest priority — there isn't time left to recover, so clear it now.`,
    },
    'inventory-depth': {
      label: 'inventory depth',
      kind: 'orange',
      rule: `≥ ${INVENTORY_PRESSURE} units per remaining week still on hand. A lot of stock to move in the time left.`,
    },
    'decelerating': {
      label: 'decelerating',
      kind: 'attention',
      rule: 'Tracked plan early, then momentum stalled. The sell-through curve flattened out.',
    },
    'never-started': {
      label: 'never started',
      kind: 'done',
      rule: 'Behind plan from the opening weeks — it never found its pace.',
    },
    'behind-plan': {
      label: 'behind plan',
      kind: 'muted',
      rule: `More than ${Math.round(FLAG_THRESHOLD * 100)} points behind the plan checkpoint, without a more specific cause.`,
    },
  };

  const TIER_META = {
    First: { discountPct: 15, kind: 'success', note: 'A gentle first nudge — shallow markdown to test demand.' },
    Second: { discountPct: 25, kind: 'attention', note: 'A deeper cut for goods that didn’t respond to the first.' },
    Clearance: { discountPct: 40, kind: 'danger', note: 'Liquidation depth — clear it before the season ends.' },
  };

  window.MDS = {
    WEEKS_TOTAL, FLAG_THRESHOLD,
    generateProductClass, evaluate, recommendTier,
    classifyReason, composeExplanation, buildTrajectory,
    applyEdit, evaluateClass,
    round1, round2,
    baseTierIndex,
    REASON_META, TIER_META, TIERS,
  };
})();
