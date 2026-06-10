// @scaffolding — the `@/components/MarkdownSurface` import, the `initialSeed` prop, and the
// `candidate-row` test id are a provisional surface /build may refine. The BEHAVIORS are the
// contract: a candidate row is a collapsed-by-default disclosure (aria-expanded) whose detail
// panel reveals a why-flagged readout, a three-tier ladder (each tier marked clears/below the
// floor, the engine's chosen tier highlighted), and exactly the four F2 edit fields; the
// accordion is single-open; editing a field recomputes live and re-ranks; nothing shows NaN.
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MarkdownSurface } from '@/components/MarkdownSurface';
import { buildCandidates } from '@/pipeline';

const SEED = 42;

/** The row's primary control is its only <button> (edit fields are spinbuttons). */
function expander(row: HTMLElement) {
  return within(row).getByRole('button');
}
function open(row: HTMLElement) {
  if (expander(row).getAttribute('aria-expanded') !== 'true') fireEvent.click(expander(row));
}

describe('MarkdownSurface — expandable detail panel', () => {
  it('is collapsed by default and toggles open/closed', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const row = screen.getAllByTestId('candidate-row')[0];
    expect(expander(row)).toHaveAttribute('aria-expanded', 'false');
    expect(within(row).queryAllByRole('spinbutton')).toHaveLength(0); // detail absent
    open(row);
    expect(expander(row)).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(expander(row));
    expect(expander(row)).toHaveAttribute('aria-expanded', 'false');
  });

  it('is a single-open accordion: opening one row collapses another', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const [row0, row1] = screen.getAllByTestId('candidate-row');
    open(row0);
    expect(within(row0).getAllByRole('spinbutton').length).toBeGreaterThan(0);
    open(row1);
    expect(within(row1).getAllByRole('spinbutton').length).toBeGreaterThan(0);
    expect(within(row0).queryAllByRole('spinbutton')).toHaveLength(0); // row0 collapsed
  });

  it('exposes exactly the four F2 edit fields in the open detail', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const row = screen.getAllByTestId('candidate-row')[0];
    open(row);
    const controls = within(row).getAllByRole('spinbutton');
    expect(controls).toHaveLength(4);
    controls.forEach((c) => expect(c).toBeEnabled());
    within(row).getByRole('spinbutton', { name: /sell-?through|sold/i });
    within(row).getByRole('spinbutton', { name: /price/i });
    within(row).getByRole('spinbutton', { name: /floor/i });
    within(row).getByRole('spinbutton', { name: /weeks?/i });
  });

  it('shows the why-flagged gap in points, matching the candidate gapPoints', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const c = buildCandidates(SEED)[0];
    const row = screen.getAllByTestId('candidate-row')[0];
    open(row);
    // The gap-behind-plan figure (in points) is present in the open detail.
    expect(within(row).getAllByText(new RegExp(`\\b${c.gapPoints}\\b`)).length).toBeGreaterThan(0);
  });

  it('renders the three-tier ladder with each tier’s floor verdict and marks the chosen tier', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const c = buildCandidates(SEED)[0];
    const row = screen.getAllByTestId('candidate-row')[0];
    open(row);
    const detail = row;
    // all three tiers and their discount percentages
    ['First', 'Second', 'Clearance'].forEach((t) =>
      expect(within(detail).getAllByText(new RegExp(t)).length).toBeGreaterThan(0),
    );
    ['15%', '25%', '40%'].forEach((p) =>
      expect(within(detail).getAllByText(new RegExp(p)).length).toBeGreaterThan(0),
    );
    // each ladder rung states whether it clears or is below the floor
    expect(within(detail).getAllByText(/clears floor|below floor/i).length).toBeGreaterThanOrEqual(3);
    // the engine's chosen tier for this CC reaches the detail
    expect(within(detail).getAllByText(new RegExp(c.tier)).length).toBeGreaterThan(0);
  });

  it('recomputes live: editing a candidate to sold-out drops it and promotes the next', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const cands = buildCandidates(SEED);
    const before = cands.length;
    const row0 = screen.getAllByTestId('candidate-row')[0];
    open(row0);
    fireEvent.change(within(row0).getByRole('spinbutton', { name: /sell-?through|sold/i }), {
      target: { value: '100' },
    });
    const rowsAfter = screen.getAllByTestId('candidate-row');
    expect(rowsAfter).toHaveLength(before - 1);
    // the former rank-2 candidate is now the engine's top row
    expect(rowsAfter[0].textContent ?? '').toContain(cands[1].name);
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  it('treats a cleared edit field as a no-op (no NaN, surface intact)', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const row = screen.getAllByTestId('candidate-row')[0];
    open(row);
    fireEvent.change(within(row).getByRole('spinbutton', { name: /sell-?through|sold/i }), {
      target: { value: '' },
    });
    expect(document.body.textContent).not.toMatch(/NaN/);
    expect(screen.getAllByTestId('candidate-row').length).toBeGreaterThan(0);
  });
});
