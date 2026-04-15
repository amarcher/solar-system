import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ViewMode, ObserverLocation } from './types';
import { DEFAULT_OBSERVER } from './types';
import * as AstronomyService from './AstronomyService';

interface AstronomyContextValue {
  // ── View mode ──
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;

  // ── Simulation time ──
  /** Display-ready time (updated ~1Hz for UI). Use timeRef for per-frame reads. */
  displayTime: Date;
  /** Ref to current epoch ms — read this in useFrame for zero-rerender position updates. */
  timeRef: React.RefObject<number>;
  rate: number;
  setDate: (d: Date) => void;
  setRate: (r: number) => void;

  // ── Observer ──
  observer: ObserverLocation;
  setObserver: (loc: ObserverLocation) => void;

  // ── Engine state ──
  engineReady: boolean;
}

const AstronomyCtx = createContext<AstronomyContextValue | null>(null);

export function useAstronomy(): AstronomyContextValue {
  const ctx = useContext(AstronomyCtx);
  if (!ctx) throw new Error('useAstronomy must be used within <AstronomyProvider>');
  return ctx;
}

export function AstronomyProvider({ children }: { children: ReactNode }) {
  const [mode, setModeRaw] = useState<ViewMode>('artistic');
  const [engineReady, setEngineReady] = useState(false);
  const [observer, setObserver] = useState<ObserverLocation>(DEFAULT_OBSERVER);

  // Time state: ref for per-frame reads, useState for 1Hz UI updates.
  const timeRef = useRef<number>(Date.now());
  const rateRef = useRef<number>(1);
  const [displayTime, setDisplayTime] = useState(() => new Date());
  const [rate, setRateState] = useState(1);

  // Throttled display-time sync (~1Hz)
  useEffect(() => {
    const id = setInterval(() => {
      setDisplayTime(new Date(timeRef.current));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Advance simulation time via requestAnimationFrame when in a realistic mode.
  useEffect(() => {
    if (mode === 'artistic') return;
    let prev = performance.now();
    let raf: number;
    function tick(now: number) {
      const delta = (now - prev) / 1000; // seconds
      prev = now;
      timeRef.current += delta * rateRef.current * 1000;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  const setDate = useCallback((d: Date) => {
    timeRef.current = d.getTime();
    setDisplayTime(d);
  }, []);

  const setRate = useCallback((r: number) => {
    rateRef.current = r;
    setRateState(r);
  }, []);

  // Lazy-load the astronomy engine when switching away from artistic mode.
  const setMode = useCallback((m: ViewMode) => {
    setModeRaw(m);
    if (m !== 'artistic' && !AstronomyService.isReady()) {
      AstronomyService.preload().then(() => setEngineReady(true));
    }
  }, []);

  // Sync engineReady if already loaded (e.g. hot-reload).
  useEffect(() => {
    if (AstronomyService.isReady()) setEngineReady(true);
  }, []);

  return (
    <AstronomyCtx.Provider
      value={{
        mode,
        setMode,
        displayTime,
        timeRef,
        rate,
        setDate,
        setRate,
        observer,
        setObserver,
        engineReady,
      }}
    >
      {children}
    </AstronomyCtx.Provider>
  );
}
