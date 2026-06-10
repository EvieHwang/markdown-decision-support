// @frozen — the AA-targeted accessibility baseline for the redesigned surface: a single main
// landmark and one h1, non-skipping heading levels, an accessible name on every interactive
// control, and a non-empty text alternative on every sparkline. AA-TARGETED — color contrast,
// focus-visible styling, reflow/zoom, and a full WCAG 2.1 AA criterion audit are deferred (the
// acknowledged deviation inherited from demo-presentation-pass-5; see constitution risks).
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownSurface } from '@/components/MarkdownSurface';

const SEED = 42;

describe('MarkdownSurface — accessibility baseline', () => {
  it('exposes a single main landmark and exactly one h1', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('nests headings under the h1 without skipping a level', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const levels = screen
      .getAllByRole('heading')
      .map((h) => Number(h.getAttribute('aria-level') ?? h.tagName[1]));
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    const present = new Set(levels);
    for (const level of present) {
      if (level > 1) expect(present.has(level - 1)).toBe(true);
    }
  });

  it('gives every interactive control a non-empty accessible name', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    [...screen.getAllByRole('button'), ...screen.getAllByRole('spinbutton')].forEach((el) =>
      expect(el).toHaveAccessibleName(),
    );
  });

  it('gives every sparkline a non-empty text alternative naming actual vs plan', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const charts = screen.getAllByRole('img');
    expect(charts.length).toBeGreaterThan(0);
    charts.forEach((c) => {
      expect(c).toHaveAccessibleName(/actual/i);
      expect(c).toHaveAccessibleName(/%/);
    });
  });
});
