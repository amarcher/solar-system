import { useCallback, useEffect, useRef, useState } from 'react';
import type { NavigationState } from '../../types/celestialBody';
import { useAstronomy } from '../../astronomy/useAstronomy';
import { TIDES_OVERLAY_STATE, type TidesState } from './model';

/** A scene layer; it never borrows the exploration camera or clock. */
export function useTidesLesson(nav: NavigationState) {
  const { mode } = useAstronomy();
  const [state, setState] = useState<TidesState | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const close = useCallback((restoreFocus = true) => {
    setState(null);
    if (restoreFocus) requestAnimationFrame(() => {
      const original = returnFocus.current;
      const detailClose = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Details for Earth"] .detail__close');
      const target = detailClose ?? (original?.isConnected && original.getClientRects().length ? original
        : document.querySelector<HTMLElement>('.app__toolbar-toggle'));
      target?.focus();
    });
  }, []);
  const open = useCallback(() => {
    if (mode === 'sky') return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setState(TIDES_OVERLAY_STATE);
    requestAnimationFrame(() => {
      const toggle = document.querySelector<HTMLElement>('[data-tides-entry]');
      const target = toggle?.getClientRects().length ? toggle
        : document.querySelector<HTMLElement>('.app__toolbar-toggle');
      target?.focus({ preventScroll: true });
    });
  }, [mode]);
  useEffect(() => {
    // Navigation owns the destination. An Earth layer cannot remain on another body.
    if (mode === 'sky' || nav.level !== 'planet' || nav.planetId !== 'earth') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(null);
    }
  }, [nav, mode]);
  return { state, open, close };
}
