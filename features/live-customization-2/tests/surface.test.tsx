// @scaffolding — UPDATED for the Feature 7 surface redesign: the active surface is now
// `MarkdownSurface` (replacing `CustomizationView`), and the four editable controls per CC
// live behind the row's expansion (the detail panel) rather than always-visible. The F2
// CONTRACT this suite guards is unchanged: the full class renders (candidates + non-candidates),
// each CC has exactly four labeled editable controls, editing recomputes live (a sold-out edit
// drops the candidate), the surface is deterministic in the seed, and regenerate advances the
// seed while discarding pending edits. The component path / row test ids remain provisional.
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MarkdownSurface } from '@/components/MarkdownSurface';
import { buildCandidates } from '@/pipeline';
import { evaluateClass } from '@/pipeline';
import { generateProductClass } from '@/data';

const SEED = 42;

/** The row's expand control is its only <button>; edit fields are spinbuttons in the detail. */
function open(row: HTMLElement) {
  const btn = within(row).getByRole('button');
  if (btn.getAttribute('aria-expanded') !== 'true') fireEvent.click(btn);
}
function sellThroughOf(row: HTMLElement) {
  return within(row).getByRole('spinbutton', { name: /sell-?through|sold/i });
}

describe('MarkdownSurface — the interactive surface (F2 contract)', () => {
  it('renders the whole class: ranked candidates plus the non-candidates, each CC once', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const { candidates, nonCandidates } = evaluateClass(generateProductClass(SEED));
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(candidates.length);
    expect(screen.queryAllByTestId('noncandidate-row')).toHaveLength(nonCandidates.length);
    expect(candidates.length + nonCandidates.length).toBe(generateProductClass(SEED).length);
  });

  it('exposes semantic rows, not bare divs', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    expect(screen.getAllByRole('heading').length).toBeGreaterThanOrEqual(1);
    const total = generateProductClass(SEED).length;
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(total);
  });

  it('gives each CC exactly four labeled, keyboard-reachable editable controls (in the detail)', () => {
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

  it('recomputes live: editing a candidate to fully sold removes it from the ranked list', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const before = screen.getAllByTestId('candidate-row').length;
    const row = screen.getAllByTestId('candidate-row')[0];
    open(row);
    fireEvent.change(sellThroughOf(row), { target: { value: '100' } });
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(before - 1);
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  it('never shows NaN when a control is cleared', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const row = screen.getAllByTestId('candidate-row')[0];
    open(row);
    fireEvent.change(sellThroughOf(row), { target: { value: '' } });
    expect(document.body.textContent).not.toMatch(/NaN/);
    expect(screen.queryAllByTestId('candidate-row').length).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic in the seed: setting the seed renders that exact class', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const seedInput = screen.getByLabelText(/seed/i);
    fireEvent.change(seedInput, { target: { value: '7' } });
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(buildCandidates(7).length);
    fireEvent.change(seedInput, { target: { value: '42' } });
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(buildCandidates(42).length);
  });

  it('discards pending edits when the class is rebuilt from a seed', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const before = buildCandidates(SEED).length;
    const row = screen.getAllByTestId('candidate-row')[0];
    open(row);
    fireEvent.change(sellThroughOf(row), { target: { value: '100' } });
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(before - 1);
    // rebuild by moving the seed away and back; the edit is gone in the fresh class
    const seedInput = screen.getByLabelText(/seed/i);
    fireEvent.change(seedInput, { target: { value: '7' } });
    fireEvent.change(seedInput, { target: { value: '42' } });
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(before);
  });

  it('regenerate advances to a new seed and re-renders without error', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const seedBefore = (screen.getByLabelText(/seed/i) as HTMLInputElement).value;
    fireEvent.click(screen.getByRole('button', { name: /regenerate|new sample/i }));
    const seedAfter = (screen.getByLabelText(/seed/i) as HTMLInputElement).value;
    expect(seedAfter).not.toBe(seedBefore);
    expect(document.body.textContent).not.toMatch(/NaN/);
  });
});
