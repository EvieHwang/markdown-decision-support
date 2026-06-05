// @scaffolding — the component import path and the `candidate-row` test id are a
// provisional surface /build may refine (logging in build-deviations.md). The
// behaviors are the contract: one row per candidate in the given order, each showing
// name + tier + explanation; empty list renders no rows without throwing; candidate
// text is rendered as text, not interpreted as HTML.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    explanation: 'Aria Pump — Black: 18 pts behind plan, 5 wks left — suggest Second (25% off).',
    ...overrides,
  };
}

describe('CandidateSurface — the single screen', () => {
  it('renders one row per candidate', () => {
    render(
      <CandidateSurface
        candidates={[candidate({ id: 'a1' }), candidate({ id: 'a2', name: 'Aria Pump — Red' })]}
      />,
    );
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(2);
  });

  it('preserves the given order of candidates', () => {
    render(
      <CandidateSurface
        candidates={[
          candidate({ id: 'a1', name: 'First Row' }),
          candidate({ id: 'a2', name: 'Second Row' }),
        ]}
      />,
    );
    const rows = screen.getAllByTestId('candidate-row');
    expect(rows[0]).toHaveTextContent('First Row');
    expect(rows[1]).toHaveTextContent('Second Row');
  });

  it('shows the name, tier with percentage, and explanation for a candidate', () => {
    render(<CandidateSurface candidates={[candidate()]} />);
    const row = screen.getByTestId('candidate-row');
    expect(row).toHaveTextContent('Aria Pump — Black');
    expect(row).toHaveTextContent('Second');
    expect(row).toHaveTextContent('25');
    expect(row).toHaveTextContent('18 pts behind plan');
  });

  it('renders zero rows and does not throw when given an empty list', () => {
    render(<CandidateSurface candidates={[]} />);
    expect(screen.queryAllByTestId('candidate-row')).toHaveLength(0);
  });

  it('exposes a heading and semantic rows (a list or table), not a bare div soup', () => {
    render(
      <CandidateSurface candidates={[candidate({ id: 'a1' }), candidate({ id: 'a2' })]} />,
    );
    // a heading labels the surface
    expect(screen.getAllByRole('heading').length).toBeGreaterThanOrEqual(1);
    // candidates are exposed as semantic rows — listitems (a list) or rows (a table) —
    // one per candidate. The test stays neutral on which of the two /build chooses.
    const semanticItems = [
      ...screen.queryAllByRole('listitem'),
      ...screen.queryAllByRole('row'),
    ];
    expect(semanticItems.length).toBeGreaterThanOrEqual(2);
  });

  it('renders a candidate name as text, not as HTML markup', () => {
    const malicious = '<img src=x onerror="alert(1)">';
    render(<CandidateSurface candidates={[candidate({ name: malicious })]} />);
    // the literal characters appear as text...
    expect(screen.getByText(/<img src=x onerror=/)).toBeInTheDocument();
    // ...and no actual <img> element was injected.
    expect(document.querySelector('img')).toBeNull();
  });

  it('renders a candidate explanation as text, not as HTML markup', () => {
    const malicious = 'Aria — <img src=x onerror="alert(1)"> suggest Second (25% off).';
    render(<CandidateSurface candidates={[candidate({ explanation: malicious })]} />);
    expect(screen.getByText(/<img src=x onerror=/)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
});
