import { useCallback, useEffect, useRef, useState } from 'react';
import type { NavigationState } from '../../types/celestialBody';
import { useAstronomy } from '../../astronomy/useAstronomy';
import { INITIAL_TIDES, type TidesState } from './model';
import { isSameDestination, restoreExploration, snapshotExploration, type ExplorationSnapshot } from './session';

export function useTidesLesson(nav: NavigationState) {
  const { mode, timeRef, rate, setDate, setRate } = useAstronomy();
  const [state, setState] = useState<TidesState | null>(null);
  const [waterMotionPaused, setWaterMotionPaused] = useState(false);
  const snapshot = useRef<ExplorationSnapshot | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const navKey = JSON.stringify(nav);
  const close = useCallback((restoreFocus = true) => {
    const saved = snapshot.current;
    if (!saved) return;
    snapshot.current = null;
    restoreExploration(saved, setDate, setRate);
    setState(null);
    if (restoreFocus) requestAnimationFrame(() => {
      const target = returnFocus.current;
      if (target?.isConnected) target.focus();
      else document.querySelector<HTMLElement>('[data-tides-entry]')?.focus();
    });
  }, [setDate, setRate]);
  const open = useCallback(() => {
    if (snapshot.current || nav.level !== 'planet' || nav.planetId !== 'earth' || mode === 'sky') return;
    snapshot.current = snapshotExploration(timeRef.current, rate, navKey, mode);
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setRate(0);
    setWaterMotionPaused(false);
    setState({ ...INITIAL_TIDES });
  }, [nav, mode, timeRef, rate, navKey, setRate]);
  useEffect(() => {
    // External navigation owns the new destination; releasing the lesson must
    // synchronously restore its borrowed clock before another frame is drawn.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (snapshot.current && !isSameDestination(snapshot.current, navKey, mode)) close(false);
  }, [navKey, mode, close]);
  const update = useCallback((patch: Partial<TidesState>) => setState((previous) => previous ? { ...previous, ...patch } : null), []);
  return { state, open, close, update, waterMotionPaused, setWaterMotionPaused };
}
