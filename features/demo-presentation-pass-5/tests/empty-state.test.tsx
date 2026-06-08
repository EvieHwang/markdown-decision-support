// @scaffolding — the empty-state's `candidates-empty` test id and its exact copy are a
// provisional surface /build may refine (logging in build-deviations.md). The CONTRACT is
// the behavior: when the candidate count reaches zero the surface shows a deliberate,
// affirmative empty state (a `role="status"`, not a bare empty list); the message is absent
// while candidates exist; neither section renders a dangling parenthesized-zero "(0)" count
// over an empty list (keyed on the count convention, not the section name, since the polish
// pass may rename sections); and no NaN ever appears.
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { CustomizationView } from '@/components/CustomizationView';

const SEED = 42;
const AFFIRMATIVE =
  /nothing (is )?behind plan|no .*(candidates|markdowns)|every cc .*plan|all .*(on|tracking).*plan|tracking to plan/i;

/** Set the sell-through field of the first row of a given kind to `value`. */
function setFirstSellThrough(testId: string, value: string) {
  const row = screen.getAllByTestId(testId)[0];
  fireEvent.change(within(row).getByRole('spinbutton', { name: /sell-?through|sold/i }), {
    target: { value },
  });
}

describe('CustomizationView — empty states', () => {
  it('shows no empty-state message while candidates exist', () => {
    render(<CustomizationView initialSeed={SEED} />);
    expect(screen.getAllByTestId('candidate-row').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('candidates-empty')).toBeNull();
  });

  it('shows a deliberate empty state once every candidate is edited out', () => {
    render(<CustomizationView initialSeed={SEED} />);
    // Sell every candidate out (100%) until none remain behind plan.
    let guard = 0;
    while (screen.queryAllByTestId('candidate-row').length > 0) {
      setFirstSellThrough('candidate-row', '100');
      if (++guard > 50) throw new Error('candidates did not clear');
    }
    const empty = screen.getByTestId('candidates-empty');
    expect(empty).toHaveAttribute('role', 'status');
    expect(empty.textContent ?? '').toMatch(AFFIRMATIVE);
    // Mutual exclusion: the empty state replaces the list — no dangling "Behind plan (0)".
    expect(screen.queryByText(/\(0\)/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  it('handles the all-flagged case without a dangling empty non-candidate list', () => {
    render(<CustomizationView initialSeed={SEED} />);
    // Drive every on/ahead CC behind plan (0% sell-through) until none remain.
    let guard = 0;
    while (screen.queryAllByTestId('noncandidate-row').length > 0) {
      setFirstSellThrough('noncandidate-row', '0');
      if (++guard > 50) throw new Error('non-candidates did not clear');
    }
    expect(screen.getAllByTestId('candidate-row').length).toBeGreaterThan(0); // R3.2
    // The failure mode is a bare parenthesized-zero count over an empty list. Keyed on the
    // "(0)" convention, not the section name (which the polish pass may rename).
    expect(screen.queryByText(/\(0\)/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN/);
  });
});
