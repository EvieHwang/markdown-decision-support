// @scaffolding — exact copy (step descriptions, anatomy wording, footer text) is a provisional
// surface /build may refine. The CONTRACT is the self-documenting frame's behavior: a pipeline
// strip naming the five engine steps in order, an always-on statement that the engine is
// deterministic/rule-based (not AI) with the decision left to the buyer, a "how to read a row"
// anatomy when candidates exist, and a frame that adds no inline editable control to a row.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MarkdownSurface } from '@/components/MarkdownSurface';

const SEED = 42;
const THESIS = /deterministic|rule-?based|no ai|not an? (ai|optimi|black box)/i;

describe('MarkdownSurface — self-documenting frame', () => {
  it('presents the five engine steps in the pipeline strip', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    ['Generate', 'Compare', 'Flag', 'Rank', 'Recommend'].forEach((step) =>
      // case-sensitive word match: the step TITLE ("Flag"), not prose like "flagged"
      expect(screen.getAllByText(new RegExp(`\\b${step}\\b`)).length).toBeGreaterThan(0),
    );
  });

  it('states the deterministic-not-AI thesis without any interaction', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    expect(screen.queryAllByText(THESIS).length).toBeGreaterThan(0);
    // and that the decision stays with the buyer
    expect(screen.queryAllByText(/decision .*(yours|with you|buyer)|call is yours/i).length).toBeGreaterThan(0);
  });

  it('renders a how-to-read-a-row anatomy while candidates exist', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    expect(screen.queryAllByText(/how to read a row/i).length).toBeGreaterThan(0);
  });

  it('adds no inline editable control to a collapsed candidate row', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    // The four edit fields live behind the row's expansion; a collapsed row has none.
    const row = screen.getAllByTestId('candidate-row')[0];
    expect(within(row).queryAllByRole('spinbutton')).toHaveLength(0);
  });

  it('offers regenerate as the only sampling control — the seed itself stays internal', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/seed/i)).toBeNull();
  });
});
