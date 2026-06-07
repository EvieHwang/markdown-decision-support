// @scaffolding — the component import path and the `candidate-row` test id are the F1
// provisional surface. The F3 behavior: a candidate's reason reaches the screen — distinct
// archetypes render distinct, legible explanation text, as text (not HTML). The reason rides
// in the existing explanation rendering; no new control or view is asserted.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CandidateSurface } from '@/components/CandidateSurface';

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    name: 'Aria Pump — Black',
    price: 120,
    liquidationFloor: 60,
    severity: 0.3,
    weeksRemaining: 5,
    gapPoints: 18,
    tier: 'Second',
    discountPct: 25,
    discountedPrice: 90,
    reason: 'behind-plan',
    explanation: 'Aria Pump — Black: 18 pts behind plan, 5 wks left — suggest Second (25% off).',
    ...overrides,
  };
}

describe('CandidateSurface — the reason reaches the screen', () => {
  it('renders each candidate’s distinct reason text', () => {
    render(
      <CandidateSurface
        candidates={[
          candidate({
            id: 'a1',
            name: 'Aria Pump — Black',
            reason: 'never-started',
            explanation: 'Aria Pump — Black: never got going — 40 pts behind plan from the start, 4 wks left — suggest Clearance (40% off).',
          }),
          candidate({
            id: 'a2',
            name: 'Juno Bootie — Bone',
            reason: 'seasonal-cliff',
            explanation: 'Juno Bootie — Bone: only 1 wk left to clear it — 22 pts behind plan — suggest Second (25% off).',
          }),
        ]}
      />,
    );
    const rows = screen.getAllByTestId('candidate-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText(/never got going/)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/only 1 wk left to clear it/)).toBeInTheDocument();
  });

  it('renders reason text as text, not as HTML markup', () => {
    const malicious = 'Aria — never got going <img src=x onerror="alert(1)"> — 9 pts behind plan, 2 wks left.';
    render(<CandidateSurface candidates={[candidate({ explanation: malicious })]} />);
    expect(screen.getByText(/<img src=x onerror=/)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
});
