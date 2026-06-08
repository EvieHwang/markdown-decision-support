// @scaffolding — the disclosure's accessible name ("how this works") and the exact thesis
// wording are a provisional surface /build may refine (logging in build-deviations.md). The
// CONTRACT is the behavior: a single collapsed-by-default disclosure that toggles via
// `aria-expanded` and, when expanded, states the deterministic-not-AI thesis; the
// candidate / non-candidate lists and F2's four editable controls coexist with it unchanged.
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { CustomizationView } from '@/components/CustomizationView';

const SEED = 42;
// The thesis concept (deterministic, rule-based, not an AI/optimizer). Tolerant of wording.
const THESIS = /deterministic|rule-?based|not an? (ai|optimi|black box)|no ai|no llm/i;

function framingToggle() {
  return screen.getByRole('button', {
    name: /how (this |it )?works|about this tool/i,
  });
}

describe('CustomizationView — thesis framing', () => {
  it('renders a "how this works" disclosure, collapsed by default', () => {
    render(<CustomizationView initialSeed={SEED} />);
    expect(framingToggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands to reveal the thesis and collapses again on activation', () => {
    render(<CustomizationView initialSeed={SEED} />);
    const toggle = framingToggle();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryAllByText(THESIS).length).toBeGreaterThan(0);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('communicates that recommendations are deterministic, not an AI optimizer', () => {
    render(<CustomizationView initialSeed={SEED} />);
    fireEvent.click(framingToggle());
    expect(screen.queryAllByText(THESIS).length).toBeGreaterThan(0);
  });

  it('coexists with the candidate/non-candidate lists and adds no editable control', () => {
    render(<CustomizationView initialSeed={SEED} />);
    fireEvent.click(framingToggle()); // open the framing
    expect(screen.getAllByTestId('candidate-row').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('noncandidate-row').length).toBeGreaterThan(0);
    // F2's four-editable-controls-per-CC contract is untouched by the framing.
    const row = screen.getAllByTestId('candidate-row')[0];
    expect(within(row).getAllByRole('spinbutton')).toHaveLength(4);
  });
});
