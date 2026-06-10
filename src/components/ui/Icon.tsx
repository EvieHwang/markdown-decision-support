import type { CSSProperties, ReactNode } from 'react';

/**
 * The hand-drawn 16px stroke icon set (Feature 7 — Surface Redesign). A small,
 * dependency-free Octicon-flavored set drawn with `currentColor` strokes, ported from
 * the design prototype's `MDS_ICON_PATHS`. Icons are decorative — every `Icon` is
 * `aria-hidden`, so screen readers skip them and `getAllByRole('img')` only ever
 * picks up the sparklines (which carry real text alternatives).
 */
export type IconName =
  | 'clock'
  | 'package'
  | 'tag'
  | 'pulse'
  | 'pencil'
  | 'chevron'
  | 'sync'
  | 'sun'
  | 'moon'
  | 'search'
  | 'info'
  | 'check'
  | 'dollar'
  | 'arrowDown'
  | 'flag'
  | 'layers'
  | 'book';

const PATHS: Record<IconName, ReactNode> = {
  clock: (
    <>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.5V8l2.6 1.5" />
    </>
  ),
  package: (
    <>
      <path d="M8 1.6 13.6 4.7v6.6L8 14.4 2.4 11.3V4.7z" />
      <path d="M2.5 4.8 8 7.9l5.5-3.1M8 7.9V14" />
    </>
  ),
  tag: (
    <>
      <path d="M2.2 2.2h4.2L13.4 9.2a1.3 1.3 0 0 1 0 1.8l-2.4 2.4a1.3 1.3 0 0 1-1.8 0L2.2 6.4z" />
      <circle cx="5" cy="5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  pulse: <path d="M1.5 8h3l1.6-4 2.8 8 1.6-4h3" strokeLinejoin="round" strokeLinecap="round" />,
  pencil: (
    <>
      <path d="M11.3 2.3 13.7 4.7 5.4 13H3v-2.4z" />
      <path d="M10 3.6 12.4 6" />
    </>
  ),
  chevron: <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />,
  sync: (
    <>
      <path d="M13.5 8a5.5 5.5 0 0 1-9.4 3.9M2.5 8a5.5 5.5 0 0 1 9.4-3.9" />
      <path d="M12.4 1.6v2.6H9.8M3.6 14.4v-2.6h2.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  sun: (
    <>
      <circle cx="8" cy="8" r="3.2" />
      <path
        d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.3 3.3l1.1 1.1M11.6 11.6l1.1 1.1M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1"
        strokeLinecap="round"
      />
    </>
  ),
  moon: <path d="M13.4 9.3A5.6 5.6 0 1 1 6.7 2.6a4.4 4.4 0 0 0 6.7 6.7" strokeLinejoin="round" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3.3 3.3" strokeLinecap="round" />
    </>
  ),
  info: (
    <>
      <circle cx="8" cy="8" r="6.3" />
      <path d="M8 7.2v3.6" strokeLinecap="round" />
      <circle cx="8" cy="5.1" r="0.55" fill="currentColor" stroke="none" />
    </>
  ),
  check: <path d="m3 8.4 3.2 3.2L13 4.8" strokeLinecap="round" strokeLinejoin="round" />,
  dollar: (
    <>
      <path d="M8 1.5v13" strokeLinecap="round" />
      <path
        d="M11 4.3C10.2 3.4 9.2 3 8 3 6.3 3 5 3.9 5 5.3c0 3.2 6 1.4 6 4.6C11 11.4 9.6 12.4 8 12.4c-1.4 0-2.6-.5-3.4-1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  arrowDown: <path d="M8 3v10m0 0 3.5-3.5M8 13l-3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />,
  flag: (
    <>
      <path d="M3.5 1.5v13" strokeLinecap="round" />
      <path d="M3.5 2.4h7l-1.4 2.6 1.4 2.6h-7" strokeLinejoin="round" />
    </>
  ),
  layers: (
    <>
      <path d="M8 1.8 14.2 5 8 8.2 1.8 5z" strokeLinejoin="round" />
      <path d="m1.8 8 6.2 3.2L14.2 8M1.8 11l6.2 3.2L14.2 11" strokeLinejoin="round" />
    </>
  ),
  book: (
    <>
      <path d="M2.5 2.6h4.2c.8 0 1.3.5 1.3 1.3v9.5c0-.6-.5-1-1.1-1H2.5z" strokeLinejoin="round" />
      <path d="M13.5 2.6H9.3c-.8 0-1.3.5-1.3 1.3v9.5c0-.6.5-1 1.1-1h4.4z" strokeLinejoin="round" />
    </>
  ),
};

export function Icon({
  name,
  size = 16,
  stroke = 1.5,
  className = '',
  style,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      className={className}
      style={{ flex: 'none', ...style }}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
