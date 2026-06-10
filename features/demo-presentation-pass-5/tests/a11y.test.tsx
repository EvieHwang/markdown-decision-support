// @frozen — accessibility baseline contracts the polish pass must not regress: one main
// landmark, exactly one h1, non-skipping heading levels, every interactive control
// accessibly named, and a language-declared shipped document. AA-TARGETED — color contrast,
// focus-visible styling, reflow/zoom, and a full WCAG 2.1 AA criterion audit are explicitly
// deferred (acknowledged deviation; see spec ## Adversarial gate and constitution risks).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import App from '@/App';

describe('Surface — accessibility baseline', () => {
  it('exposes a main landmark and exactly one h1', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('uses a non-skipping heading order under the single h1', () => {
    render(<App />);
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
    render(<App />);
    [...screen.getAllByRole('button'), ...screen.queryAllByRole('spinbutton')].forEach((el) =>
      expect(el).toHaveAccessibleName(),
    );
  });

  it('declares a document language in the shipped HTML', () => {
    // Resolve from this test file's own location (repo root is three levels up).
    const indexHtml = readFileSync(resolve(import.meta.dirname, '../../../index.html'), 'utf8');
    expect(indexHtml).toMatch(/<html[^>]*\blang=["'][a-z]/i);
  });
});
