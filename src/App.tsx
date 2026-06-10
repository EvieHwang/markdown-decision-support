import { MarkdownSurface } from '@/components/MarkdownSurface';

// The starting seed for the surface. The buyer can edit the seed or regenerate from
// here (Feature 2 — Live Customization; Feature 7 — Surface Redesign).
const SEED = 42;

/**
 * Thin shell (Feature 7). Renders the active `MarkdownSurface` and nothing else — it
 * introduces no landmark of its own, so the single `main` lives in `MarkdownSurface`
 * (a11y baseline: exactly one `main`, one `h1`).
 */
export default function App() {
  return <MarkdownSurface initialSeed={SEED} />;
}
