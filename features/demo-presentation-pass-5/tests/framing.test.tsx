// @scaffolding — UPDATED for the Feature 7 surface redesign: the determinism framing is no
// longer a collapsed "How this works" disclosure but an ALWAYS-ON frame (pipeline strip + hero
// chips + footer) on the new `MarkdownSurface`. The disclosure-toggle assertions are dropped as
// no longer applicable. The surviving demo-5 R1 CONTRACT this suite guards: a cold visitor can
// see — without interacting — that the recommendations are deterministic / rule-based (not an
// AI optimizer) and that the decision stays with the buyer, while the candidate / non-candidate
// lists and F2's four editable controls coexist with the framing unchanged.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MarkdownSurface } from '@/components/MarkdownSurface';

const SEED = 42;
const THESIS = /deterministic|rule-?based|not an? (ai|optimi|black box)|no ai|no llm/i;
const BUYER_DECIDES = /decision .*(yours|with you|buyer)|call is yours|never decides|suggests/i;

describe('MarkdownSurface — determinism framing (demo-5 R1, redesigned)', () => {
  it('states the deterministic-not-AI thesis without any interaction', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    expect(screen.queryAllByText(THESIS).length).toBeGreaterThan(0);
  });

  it('communicates that the decision stays with the buyer', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    expect(screen.queryAllByText(BUYER_DECIDES).length).toBeGreaterThan(0);
  });

  it('coexists with the candidate/non-candidate lists', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    expect(screen.getAllByTestId('candidate-row').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('noncandidate-row').length).toBeGreaterThan(0);
  });

  it('adds no editable control to a collapsed row (F2’s four stay behind expansion)', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const row = screen.getAllByTestId('candidate-row')[0];
    expect(within(row).queryAllByRole('spinbutton')).toHaveLength(0);
  });
});
