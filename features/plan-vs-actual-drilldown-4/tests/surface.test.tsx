// @scaffolding — UPDATED for the Feature 7 surface redesign: the active surface is now
// `MarkdownSurface`, and the per-CC plan-vs-actual chart is the always-visible inline
// `Sparkline` (replacing the on-demand `TrajectoryChart`). The "collapsed by default / reveal
// on toggle" assertion is intentionally dropped — the redesign shows the trajectory on every
// row at all times. The surviving F4 CONTRACT this suite guards: every CC (candidate AND
// non-candidate) shows a plan-vs-actual chart with a text alternative stating the current
// actual position; that text follows a live edit; a degenerate single-observed-week CC still
// renders; editing stays wired (four controls, live recompute); nothing shows NaN. The F4 unit
// suite `trajectory.test.ts` is untouched. Component path / row test ids remain provisional.
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MarkdownSurface } from '@/components/MarkdownSurface';
import { buildCandidates } from '@/pipeline';

const SEED = 42;

function open(row: HTMLElement) {
  const btn = within(row).getByRole('button');
  if (btn.getAttribute('aria-expanded') !== 'true') fireEvent.click(btn);
}
function chartLabel(row: HTMLElement): string {
  const chart = within(row).getByRole('img');
  return (
    chart.getAttribute('aria-label') ||
    chart.querySelector('title')?.textContent ||
    chart.textContent ||
    ''
  );
}
function findRowByName(name: string): HTMLElement {
  const row = [
    ...screen.queryAllByTestId('candidate-row'),
    ...screen.queryAllByTestId('noncandidate-row'),
  ].find((r) => r.textContent?.includes(name));
  expect(row).toBeTruthy();
  return row as HTMLElement;
}

describe('MarkdownSurface — plan-vs-actual drill-down (inline sparkline)', () => {
  it('shows a plan-vs-actual chart on every candidate row, with a stated actual position', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    screen.getAllByTestId('candidate-row').forEach((row) => {
      const chart = within(row).getByRole('img');
      expect(chart).toHaveAccessibleName(/actual/i);
      expect(chartLabel(row)).toMatch(/%/);
    });
  });

  it('shows a plan-vs-actual chart on non-candidate (on/ahead-of-plan) rows too', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const nc = screen.queryAllByTestId('noncandidate-row');
    expect(nc.length).toBeGreaterThan(0);
    nc.forEach((row) => expect(within(row).getByRole('img')).toBeInTheDocument());
  });

  it('keeps exactly four editable controls per CC with the detail open (chart is not one)', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const row = screen.getAllByTestId('candidate-row')[0];
    open(row);
    expect(within(row).getAllByRole('spinbutton')).toHaveLength(4);
    expect(within(row).getByRole('img')).toBeInTheDocument(); // chart present, not a control
  });

  it('moves the chart with a live edit (actual anchored to the engine-live position)', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const name = buildCandidates(SEED)[0].name;
    let row = screen.getAllByTestId('candidate-row')[0];
    const before = chartLabel(row);
    open(row);
    // Lower sell-through: the CC stays behind plan (still a candidate) but its actual moves.
    fireEvent.change(within(row).getByRole('spinbutton', { name: /sell-?through|sold/i }), {
      target: { value: '1' },
    });
    row = findRowByName(name);
    const after = chartLabel(row);
    expect(after).not.toBe(before);
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  it('renders the chart for a degenerate single-observed-week CC (weeks edited to 1)', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const name = buildCandidates(SEED)[0].name;
    const start = screen.getAllByTestId('candidate-row')[0];
    open(start);
    fireEvent.change(within(start).getByRole('spinbutton', { name: /weeks?/i }), {
      target: { value: '1' },
    });
    // The CC may move sections; wherever it lives, its chart still renders.
    const row = findRowByName(name);
    expect(within(row).getByRole('img')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN/);
  });
});
