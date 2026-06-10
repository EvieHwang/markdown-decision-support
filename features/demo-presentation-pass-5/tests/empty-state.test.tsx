// @scaffolding — UPDATED for the Feature 7 surface redesign: the active surface is now
// `MarkdownSurface`, and edits live behind a row's expansion, so the sell-out helper opens a
// row before editing. The demo-5 R2/R3 CONTRACT is unchanged in spirit: when the candidate
// count reaches zero the surface shows a deliberate, affirmative empty state (a `role="status"`,
// not a bare empty list); the message is absent while candidates exist; and neither section
// dangles a parenthesized-zero "(0)" count over an empty list. NOTE: non-candidate rows are
// read-only in the redesign (only flagged candidates expand to edit), so the "drive every CC
// behind plan" direction is unreachable via the UI — the non-candidate side is guarded here in
// the reachable direction (after every candidate is sold out, the whole class is on/ahead and
// no "(0)" dangles). The `candidates-empty` test id and copy remain provisional.
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MarkdownSurface } from '@/components/MarkdownSurface';
import { generateProductClass } from '@/data';

const SEED = 42;
const AFFIRMATIVE =
  /nothing (is )?behind plan|no .*(candidates|markdowns)|every cc .*plan|all .*(on|tracking).*plan|tracking to plan|on or ahead/i;

/** Expand the first candidate row and set its sell-through, dropping it out of candidacy. */
function sellFirstCandidateOut() {
  const row = screen.getAllByTestId('candidate-row')[0];
  const btn = within(row).getByRole('button');
  if (btn.getAttribute('aria-expanded') !== 'true') fireEvent.click(btn);
  fireEvent.change(within(row).getByRole('spinbutton', { name: /sell-?through|sold/i }), {
    target: { value: '100' },
  });
}

describe('MarkdownSurface — empty states (demo-5 R2/R3, redesigned)', () => {
  it('shows no empty-state message while candidates exist', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    expect(screen.getAllByTestId('candidate-row').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('candidates-empty')).toBeNull();
  });

  it('shows a deliberate empty state once every candidate is edited out', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    let guard = 0;
    while (screen.queryAllByTestId('candidate-row').length > 0) {
      sellFirstCandidateOut();
      if (++guard > 50) throw new Error('candidates did not clear');
    }
    const empty = screen.getByTestId('candidates-empty');
    expect(empty).toHaveAttribute('role', 'status');
    expect(empty.textContent ?? '').toMatch(AFFIRMATIVE);
    // Mutual exclusion: the empty state replaces the list — no dangling "Behind plan (0)".
    expect(screen.queryByText(/\(0\)/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  it('does not dangle a (0) count: when all CCs are on/ahead they all render as non-candidates', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const total = generateProductClass(SEED).length;
    let guard = 0;
    while (screen.queryAllByTestId('candidate-row').length > 0) {
      sellFirstCandidateOut();
      if (++guard > 50) throw new Error('candidates did not clear');
    }
    // Every CC is now on/ahead of plan: the non-candidate section holds the whole class,
    // and nowhere is there a bare parenthesized-zero count over an empty list.
    expect(screen.getAllByTestId('noncandidate-row')).toHaveLength(total);
    expect(screen.queryByText(/\(0\)/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN/);
  });
});
