// @frozen — the theme contract: on first load the surface follows the OS color-scheme
// preference (falling back to dark when matchMedia is unavailable), the top-bar control
// switches the theme live and persists the choice, and a stored preference wins over the OS
// default on a later load. The storage KEY and the toggle's label wording are not asserted
// (only the observable behavior: `data-theme` on the document element + persistence across a
// remount). jsdom does not implement matchMedia, so each test stubs it explicitly.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MarkdownSurface } from '@/components/MarkdownSurface';

const SEED = 42;
const root = () => document.documentElement;

function stubMatchMedia(prefersDark: boolean | null) {
  if (prefersDark === null) {
    // simulate an environment without matchMedia
    // @ts-expect-error deleting an optional global for the test
    delete window.matchMedia;
    return;
  }
  window.matchMedia = ((query: string) => ({
    matches: prefersDark && /dark/.test(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  localStorage.clear();
  root().removeAttribute('data-theme');
});
afterEach(() => {
  cleanup();
});

describe('MarkdownSurface — theme', () => {
  it('defaults to the OS dark preference with no stored choice', () => {
    stubMatchMedia(true);
    render(<MarkdownSurface initialSeed={SEED} />);
    expect(root().getAttribute('data-theme')).toBe('dark');
  });

  it('defaults to the OS light preference with no stored choice', () => {
    stubMatchMedia(false);
    render(<MarkdownSurface initialSeed={SEED} />);
    expect(root().getAttribute('data-theme')).toBe('light');
  });

  it('falls back to dark (no throw) when matchMedia is unavailable', () => {
    stubMatchMedia(null);
    expect(() => render(<MarkdownSurface initialSeed={SEED} />)).not.toThrow();
    expect(root().getAttribute('data-theme')).toBe('dark');
  });

  it('switches the theme live when the toggle is used', () => {
    stubMatchMedia(true); // OS prefers dark
    render(<MarkdownSurface initialSeed={SEED} />);
    expect(root().getAttribute('data-theme')).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: /light/i }));
    expect(root().getAttribute('data-theme')).toBe('light');
  });

  it('persists the chosen theme so it overrides the OS default on the next load', () => {
    stubMatchMedia(true); // OS prefers dark
    render(<MarkdownSurface initialSeed={SEED} />);
    fireEvent.click(screen.getByRole('button', { name: /light/i }));
    expect(root().getAttribute('data-theme')).toBe('light');

    // Remount with the OS still preferring dark — the stored light choice must win.
    cleanup();
    root().removeAttribute('data-theme');
    stubMatchMedia(true);
    render(<MarkdownSurface initialSeed={SEED} />);
    expect(root().getAttribute('data-theme')).toBe('light');
  });
});
