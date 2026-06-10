/** Small presentation-only number formatters shared across the surface (Feature 7). */

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "$120.00" — a dollar amount at two decimals. */
export function fmt$(n: number): string {
  return `$${n.toFixed(2)}`;
}

/**
 * Strip the leading "<name>: " the engine prepends to an explanation (the row already
 * shows the name as its title), returning just the reason body. The displayed text is
 * otherwise the engine's sentence verbatim — no re-authored reason copy.
 */
export function stripName(text: string, name: string): string {
  const prefix = `${name}: `;
  return text.startsWith(prefix) ? text.slice(prefix.length) : text;
}
