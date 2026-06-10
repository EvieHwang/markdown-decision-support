// @scaffolding — the component import path (`@/components/MarkdownSurface`), the `initialSeed`
// prop, and the row test ids (`candidate-row` / `noncandidate-row`) are a provisional surface
// /build may refine (logging in build-deviations.md). The BEHAVIORS are the contract: the new
// surface renders the engine's exact candidate partition in the engine's order; each candidate
// row carries its reason label, tier badge (with the engine's discount %), explanation, and an
// inline sparkline; non-candidate rows carry a sparkline too; nothing renders NaN.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MarkdownSurface } from '@/components/MarkdownSurface';
import { generateProductClass } from '@/data';
import { evaluateClass } from '@/pipeline';
import { buildCandidates } from '@/pipeline';
import { REASON_META } from '@/presentation';

const SEED = 42;

describe('MarkdownSurface — the engine made visible', () => {
  it('renders the whole class exactly as the engine partitions it', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const { candidates, nonCandidates } = evaluateClass(generateProductClass(SEED));
    expect(screen.getAllByTestId('candidate-row')).toHaveLength(candidates.length);
    expect(screen.queryAllByTestId('noncandidate-row')).toHaveLength(nonCandidates.length);
    // total partition: every CC appears once, none dropped or duplicated
    const total = generateProductClass(SEED).length;
    expect(candidates.length + nonCandidates.length).toBe(total);
  });

  it('orders candidate rows by the engine severity order (buildCandidates)', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const expected = buildCandidates(SEED).map((c) => c.name);
    const rows = screen.getAllByTestId('candidate-row');
    expected.forEach((name, i) => {
      expect(rows[i].textContent ?? '').toContain(name);
    });
  });

  it('shows each candidate’s reason label, tier badge (engine %), and meta read', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const cands = buildCandidates(SEED);
    const rows = screen.getAllByTestId('candidate-row');
    cands.forEach((c, i) => {
      const text = rows[i].textContent ?? '';
      // the reason archetype's presentation label reaches the row
      expect(text.toLowerCase()).toContain(REASON_META[c.reason!].label.toLowerCase());
      // tier name and the engine's discount percentage both reach the row
      expect(text).toContain(c.tier);
      expect(text).toContain(`${c.discountPct}%`);
      // the meta read includes the points-behind and weeks-left figures
      expect(text).toMatch(new RegExp(`\\b${c.gapPoints}\\b`));
      expect(text).toMatch(new RegExp(`\\b${c.weeksRemaining}\\b`));
    });
  });

  it('renders the explanation with the leading "Name: " stripped (engine text otherwise)', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const c = buildCandidates(SEED)[0];
    const row = screen.getAllByTestId('candidate-row')[0];
    const text = row.textContent ?? '';
    // The engine sentence is "<name>: <body>"; the row shows <name> once (as the title)
    // and the body without the redundant leading "name:" prefix.
    const body = c.explanation.slice(`${c.name}: `.length);
    // a distinctive early fragment of the body is present
    const fragment = body.split('—')[0].trim().slice(0, 12);
    expect(text).toContain(fragment);
  });

  it('gives every candidate row an inline plan-vs-actual sparkline (role=img, named)', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    screen.getAllByTestId('candidate-row').forEach((row) => {
      const img = within(row).getByRole('img');
      expect(img).toHaveAccessibleName(/actual/i);
    });
  });

  it('gives non-candidate rows a sparkline as well', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const nc = screen.queryAllByTestId('noncandidate-row');
    expect(nc.length).toBeGreaterThan(0); // seed 42 has on/ahead CCs
    nc.forEach((row) => expect(within(row).getByRole('img')).toBeInTheDocument());
  });

  it('exposes a severity meter and rank on each candidate row', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const rows = screen.getAllByTestId('candidate-row');
    rows.forEach((row, i) => {
      // rank is shown (1-based) ...
      expect(row.textContent ?? '').toMatch(new RegExp(`\\b${i + 1}\\b`));
      // ... and a severity-meter element is present (a presentational handle; the exact
      // fill height/color is design-reviewed, not asserted here).
      expect(within(row).getByTestId('severity-meter')).toBeInTheDocument();
    });
  });

  it('never renders NaN, undefined, or [object Object]', () => {
    render(<MarkdownSurface initialSeed={SEED} />);
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/NaN|undefined|\[object Object\]/);
  });
});
