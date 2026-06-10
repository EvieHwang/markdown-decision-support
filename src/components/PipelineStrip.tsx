import { Icon } from '@/components/ui/Icon';

/**
 * The self-documenting pipeline strip (Feature 7 — R2.1). Presents the deterministic
 * engine as five ordered steps so a cold visitor sees what the tool does without
 * interacting. The step **titles** (Generate / Compare / Flag / Rank / Recommend) are
 * the contract; the descriptive copy is presentation-only.
 */
const PIPE: ReadonlyArray<readonly [string, string]> = [
  ['Generate', 'A synthetic women’s-shoes class — each color-colorway (CC) with a plan curve, sell-through, price and floor.'],
  ['Compare', 'Measure every CC’s actual sell-through against its plan checkpoint for the current week.'],
  ['Flag', 'Any CC more than 5 points behind plan becomes a markdown candidate.'],
  ['Rank', 'Order candidates by urgency — the gap, amplified by runway left and inventory depth.'],
  ['Recommend', 'Suggest a tier (15 / 25 / 40 %), capped by the liquidation floor, with a plain-language reason.'],
];

export function PipelineStrip() {
  return (
    <section className="pipeline" aria-label="How the engine works">
      <div className="pipeline-h">
        <Icon name="layers" size={14} /> How the engine works — deterministic, no AI
      </div>
      <div className="pipe-steps">
        {PIPE.map(([title, desc], i) => (
          <div className="pipe-step" key={title}>
            <div className="num">{i + 1}</div>
            <div className="t">{title}</div>
            <div className="d">{desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
