import type { ReasonArchetype, Tier } from '@/types';
import { FLAG_THRESHOLD } from '@/engine';

/**
 * Presentation copy layer (Feature 7 — Surface Redesign). Holds the human-facing
 * label / kind / rule-and-note text for each engine-producible reason archetype and
 * each markdown tier. **Presentation only** — no engine logic, no recomputed numbers.
 * The row, badge, and detail components read these; the engine never imports them.
 *
 * Two anti-drift contracts hold (presentation.test.ts):
 *  - `REASON_META` covers *every* `ReasonArchetype` the classifier can emit, so no
 *    engine reason can ever render without a label.
 *  - each `TIER_META` `discountPct` equals the engine's percentage for that tier, so
 *    the copy layer can never disagree with the engine's number.
 */

// The classifier's design constants, mirrored here only to phrase the rule copy. The
// engine owns the actual thresholds; these strings restate them for the buyer.
const CLIFF_WEEKS = 2;
const INVENTORY_PRESSURE = 300;

/** The visual "kind" a label maps to — drives the token-colored pill (see index.css). */
export type LabelKind = 'success' | 'attention' | 'orange' | 'danger' | 'done' | 'muted';

export interface ReasonMeta {
  label: string;
  kind: LabelKind;
  rule: string;
}

export interface TierMeta {
  discountPct: number;
  kind: LabelKind;
  note: string;
}

export const REASON_META: Record<ReasonArchetype, ReasonMeta> = {
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
  decelerating: {
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

export const TIER_META: Record<Tier, TierMeta> = {
  First: { discountPct: 15, kind: 'success', note: 'A gentle first nudge — shallow markdown to test demand.' },
  Second: { discountPct: 25, kind: 'attention', note: 'A deeper cut for goods that didn’t respond to the first.' },
  Clearance: { discountPct: 40, kind: 'danger', note: 'Liquidation depth — clear it before the season ends.' },
};

/** Tiers shallow → deep — the ladder order the detail panel renders. */
export const TIER_ORDER: Tier[] = ['First', 'Second', 'Clearance'];
