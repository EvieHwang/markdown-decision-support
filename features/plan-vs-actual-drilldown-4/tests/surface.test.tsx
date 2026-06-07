// @scaffolding — the component import path, the `candidate-row` / `noncandidate-row` test
// ids, and the expand toggle's accessible-name wording are a provisional surface /build
// may refine (logging in build-deviations.md). The chart's text alternative is assumed to
// be exposed via an `aria-label` or an SVG `<title>` (not `aria-labelledby`), so a test can
// read it. The behaviors are the contract: every row (candidate AND non-candidate) reveals
// an on-demand per-CC chart; the chart is collapsed by default; it carries a text
// alternative stating the current actual position; that text follows a live edit; opening a
// chart preserves F2's exactly-four-editable-controls and live recompute; nothing shows NaN.
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { CustomizationView } from '@/components/CustomizationView';
import { buildCandidates } from '@/pipeline';

const SEED = 42;

/** The expand toggle is the only <button> inside a row (edit inputs are spinbuttons). */
function toggle(row: HTMLElement) {
  return within(row).getByRole('button');
}

/** Read the chart's text alternative (accessible name), however it is exposed. */
function chartLabel(row: HTMLElement): string {
  const chart = within(row).getByRole('img');
  return (
    chart.getAttribute('aria-label') ||
    chart.querySelector('title')?.textContent ||
    chart.textContent ||
    ''
  );
}

describe('CustomizationView — plan-vs-actual drill-down', () => {
  it('reveals an on-demand chart on a candidate row; collapsed by default', () => {
    render(<CustomizationView initialSeed={SEED} />);
    const row = screen.getAllByTestId('candidate-row')[0];
    expect(within(row).queryByRole('img')).toBeNull(); // collapsed
    fireEvent.click(toggle(row));
    expect(within(row).getByRole('img')).toBeInTheDocument(); // revealed
  });

  it('reveals an on-demand chart on a non-candidate (on/ahead-of-plan) row too', () => {
    render(<CustomizationView initialSeed={SEED} />);
    const row = screen.getAllByTestId('noncandidate-row')[0];
    expect(within(row).queryByRole('img')).toBeNull();
    fireEvent.click(toggle(row));
    expect(within(row).getByRole('img')).toBeInTheDocument();
  });

  it('keeps exactly four editable controls per CC with the chart open (toggle is not one)', () => {
    render(<CustomizationView initialSeed={SEED} />);
    const row = screen.getAllByTestId('candidate-row')[0];
    fireEvent.click(toggle(row));
    const controls = within(row).getAllByRole('spinbutton');
    expect(controls).toHaveLength(4);
    controls.forEach((c) => expect(c).toBeEnabled());
  });

  it('gives the chart a text alternative stating the current actual position', () => {
    render(<CustomizationView initialSeed={SEED} />);
    const row = screen.getAllByTestId('candidate-row')[0];
    fireEvent.click(toggle(row));
    const chart = within(row).getByRole('img');
    // Not a content-free image: it names what it shows and states an actual percentage.
    expect(chart).toHaveAccessibleName(/actual/i);
    expect(chartLabel(row)).toMatch(/%/);
  });

  it('moves the chart with a live edit (actual line anchored to the engine-live position)', () => {
    render(<CustomizationView initialSeed={SEED} />);
    const name = buildCandidates(SEED)[0].name;
    let row = screen.getAllByTestId('candidate-row')[0];
    fireEvent.click(toggle(row));
    const before = chartLabel(row);

    // Lower sell-through: the CC stays behind plan (still a candidate), and its current
    // actual position changes — so the chart's text alternative must change with it.
    fireEvent.change(within(row).getByRole('spinbutton', { name: /sell-?through|sold/i }), {
      target: { value: '1' },
    });

    // Re-find the row (the list may re-sort) and ensure the chart is open.
    row = screen.getAllByTestId('candidate-row').find((r) => r.textContent?.includes(name))!;
    expect(row).toBeTruthy();
    if (!within(row).queryByRole('img')) fireEvent.click(toggle(row));
    const after = chartLabel(row);

    expect(after).not.toBe(before);
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  it('renders the chart for a degenerate single-observed-week CC (weeks edited down to 1)', () => {
    render(<CustomizationView initialSeed={SEED} />);
    const name = buildCandidates(SEED)[0].name;
    const startRow = screen.getAllByTestId('candidate-row')[0];
    // Edit weeks-elapsed down to 1 → a single observed week. The CC may leave the
    // candidate list, so re-find it wherever it now lives, in either section.
    fireEvent.change(within(startRow).getByRole('spinbutton', { name: /weeks?/i }), {
      target: { value: '1' },
    });
    const row = [
      ...screen.queryAllByTestId('candidate-row'),
      ...screen.queryAllByTestId('noncandidate-row'),
    ].find((r) => r.textContent?.includes(name))!;
    expect(row).toBeTruthy();
    if (!within(row).queryByRole('img')) fireEvent.click(toggle(row));
    expect(within(row).getByRole('img')).toBeInTheDocument(); // the degenerate chart still renders
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  it('does not disturb F2 live recompute: a sold-out edit still drops the candidate', () => {
    render(<CustomizationView initialSeed={SEED} />);
    const beforeCount = screen.getAllByTestId('candidate-row').length;
    const row = screen.getAllByTestId('candidate-row')[0];
    fireEvent.click(toggle(row)); // chart open
    fireEvent.change(within(row).getByRole('spinbutton', { name: /sell-?through|sold/i }), {
      target: { value: '100' },
    });
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(beforeCount - 1);
    expect(document.body.textContent).not.toMatch(/NaN/);
  });
});
