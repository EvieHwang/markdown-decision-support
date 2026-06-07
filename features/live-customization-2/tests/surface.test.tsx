// @scaffolding — the component import path, the `initialSeed` prop, the row test ids
// (`candidate-row` / `noncandidate-row`), and the control label wording are a provisional
// surface /build may refine (logging in build-deviations.md). The behaviors are the
// contract: the full class renders (candidates + non-candidates), four labeled editable
// controls per CC, live recompute on edit, clamping observed behaviorally, a deterministic
// seed-driven render, and regenerate that advances the seed and discards edits.
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { CustomizationView } from '@/components/CustomizationView';
import { buildCandidates } from '@/pipeline';
import { generateProductClass } from '@/data';

const SEED = 42;

function sellThrough(row: HTMLElement) {
  return within(row).getByRole('spinbutton', { name: /sell-?through|sold/i });
}

describe('CustomizationView — the interactive surface', () => {
  it('renders the whole class: ranked candidates plus the non-candidates, each CC once', () => {
    render(<CustomizationView initialSeed={SEED} />);
    const total = generateProductClass(SEED).length;
    const expectedCandidates = buildCandidates(SEED).length;
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(expectedCandidates);
    const nonCandidates = screen.queryAllByTestId('noncandidate-row');
    expect(expectedCandidates + nonCandidates.length).toBe(total);
  });

  it('exposes a heading and semantic rows, not bare divs', () => {
    render(<CustomizationView initialSeed={SEED} />);
    expect(screen.getAllByRole('heading').length).toBeGreaterThanOrEqual(1);
    const total = generateProductClass(SEED).length;
    const semantic = [...screen.queryAllByRole('listitem'), ...screen.queryAllByRole('row')];
    expect(semantic.length).toBeGreaterThanOrEqual(total);
  });

  it('gives each CC exactly four labeled, keyboard-reachable editable controls', () => {
    render(<CustomizationView initialSeed={SEED} />);
    const row = screen.getAllByTestId('candidate-row')[0];
    const controls = within(row).getAllByRole('spinbutton');
    expect(controls).toHaveLength(4);
    controls.forEach((c) => expect(c).toBeEnabled());
    // each editable input is reachable by an accessible name in the buyer's vocabulary
    within(row).getByRole('spinbutton', { name: /sell-?through|sold/i });
    within(row).getByRole('spinbutton', { name: /price/i });
    within(row).getByRole('spinbutton', { name: /floor/i });
    within(row).getByRole('spinbutton', { name: /weeks?/i });
  });

  it('recomputes live: editing a candidate to fully sold removes it from the ranked list', () => {
    render(<CustomizationView initialSeed={SEED} />);
    const before = screen.getAllByTestId('candidate-row').length;
    fireEvent.change(sellThrough(screen.getAllByTestId('candidate-row')[0]), {
      target: { value: '100' }, // clamps to fully-sold whatever the control's unit
    });
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(before - 1);
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  // Note: the floor→tier transition is verified deterministically at the unit layer in
  // recompute.test.ts ("editing the floor up caps the tier to First"), where the pre-edit
  // tier is known. No seed-agnostic floor edit guarantees an *observable* tier change at the
  // surface (and F1's explanation text repeats the tier name, defeating a text probe), so the
  // surface suite proves recompute wiring via the sell-through test above and the control's
  // existence via the four-controls test, and does not re-assert the tier transition here.

  it('never shows NaN when a control is cleared', () => {
    render(<CustomizationView initialSeed={SEED} />);
    fireEvent.change(sellThrough(screen.getAllByTestId('candidate-row')[0]), {
      target: { value: '' },
    });
    expect(document.body.textContent).not.toMatch(/NaN/);
    expect(screen.queryAllByTestId('candidate-row').length).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic in the seed: setting the seed renders that exact class', () => {
    render(<CustomizationView initialSeed={SEED} />);
    const seedInput = screen.getByLabelText(/seed/i);

    fireEvent.change(seedInput, { target: { value: '7' } });
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(buildCandidates(7).length);

    fireEvent.change(seedInput, { target: { value: '42' } });
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(buildCandidates(42).length);
  });

  it('discards pending edits when the class is regenerated from a seed', () => {
    render(<CustomizationView initialSeed={SEED} />);
    const before = buildCandidates(SEED).length;
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(before);

    fireEvent.change(sellThrough(screen.getAllByTestId('candidate-row')[0]), {
      target: { value: '100' },
    });
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(before - 1);

    // re-entering the seed rebuilds the class fresh — the edit is gone
    fireEvent.change(screen.getByLabelText(/seed/i), { target: { value: String(SEED) } });
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(before);
  });

  it('regenerate advances to a new seed and re-renders without error', () => {
    render(<CustomizationView initialSeed={SEED} />);
    const seedBefore = (screen.getByLabelText(/seed/i) as HTMLInputElement).value;
    fireEvent.click(screen.getByRole('button', { name: /regenerate|new sample/i }));
    const seedAfter = (screen.getByLabelText(/seed/i) as HTMLInputElement).value;
    expect(seedAfter).not.toBe(seedBefore);
    expect(document.body.textContent).not.toMatch(/NaN/);
  });
});
