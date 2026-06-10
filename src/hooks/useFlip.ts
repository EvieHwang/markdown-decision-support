import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * FLIP re-ranking hook (Feature 7 — R5.4). Returns a ref-callback factory keyed by CC
 * id; on each render it records each tracked row's top offset, and when the order
 * signature changes it inverts the position delta and transitions the row back to its
 * new slot (`transform`-only, respecting reduced motion). The DOM reorder is owned by
 * React; this only animates the move.
 *
 * Inert under jsdom (no layout → all offsets read 0 → no transform applied), so it
 * never interferes with the test suites — the re-rank *behavior* is asserted on DOM
 * order, the animation itself is design-reviewed.
 */
export function useFlip(orderSig: string) {
  const refs = useRef(new Map<string, HTMLElement>());
  const prev = useRef(new Map<string, number>());
  const lastSig = useRef(orderSig);

  const set = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) refs.current.set(id, el);
      else refs.current.delete(id);
    },
    [],
  );

  useLayoutEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const next = new Map<string, number>();
    refs.current.forEach((el, id) => next.set(id, el.getBoundingClientRect().top));

    if (!reduce && lastSig.current !== orderSig) {
      next.forEach((top, id) => {
        const p = prev.current.get(id);
        const el = refs.current.get(id);
        if (p != null && el && Math.abs(p - top) > 0.5) {
          const dy = p - top;
          el.style.transition = 'none';
          el.style.transform = `translateY(${dy}px)`;
          el.style.zIndex = '1';
          requestAnimationFrame(() => {
            el.style.transition = 'transform 0.44s cubic-bezier(0.22,1,0.36,1)';
            el.style.transform = '';
            const clear = () => {
              el.style.zIndex = '';
              el.style.transition = '';
              el.removeEventListener('transitionend', clear);
            };
            el.addEventListener('transitionend', clear);
          });
        }
      });
    }
    prev.current = next;
    lastSig.current = orderSig;
  });

  return set;
}
