import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ViewMode, ObserverLocation } from './types';
import { DEFAULT_OBSERVER } from './types';
import * as AstronomyService from './AstronomyService';
import { AstronomyCtx } from './useAstronomy';
import { benchmarkEnabled, BENCHMARK_DATE } from '../performance/benchmark';

const INITIAL_SIM_TIME_MS = benchmarkEnabled ? Date.parse(BENCHMARK_DATE) : Date.now();

export function AstronomyProvider({ children }: { children: ReactNode }) {
  const [mode, setModeRaw] = useState<ViewMode>('orrery');
  const [engineReady, setEngineReady] = useState(AstronomyService.isReady);
  const [observer, setObserver] = useState<ObserverLocation>(DEFAULT_OBSERVER);

  // Time state: ref for per-frame reads, useState for 1Hz UI updates.
  const timeRef = useRef<number>(INITIAL_SIM_TIME_MS);
  const rateRef = useRef<number>(benchmarkEnabled ? 0 : 1);
  const [displayTime, setDisplayTime] = useState(() => new Date(INITIAL_SIM_TIME_MS));
  const [rate, setRateState] = useState(benchmarkEnabled ? 0 : 1);

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

  const ensureEngineReady = useCallback(() => {
    AstronomyService.preload().then(() => setEngineReady(true));
  }, []);

  useEffect(() => {
    if (mode !== 'artistic') {
      ensureEngineReady();
    }
  }, [ensureEngineReady, mode]);

  // Lazy-load the astronomy engine when switching away from artistic mode.
  const setMode = useCallback((m: ViewMode) => {
    setModeRaw(m);
    if (m !== 'artistic') {
      ensureEngineReady();
    }
  }, [ensureEngineReady]);

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
