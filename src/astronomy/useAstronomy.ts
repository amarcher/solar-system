import { createContext, useContext } from 'react';
import type { ObserverLocation, ViewMode } from './types';

export interface AstronomyContextValue {
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

export const AstronomyCtx = createContext<AstronomyContextValue | null>(null);

export function useAstronomy(): AstronomyContextValue {
  const ctx = useContext(AstronomyCtx);
  if (!ctx) throw new Error('useAstronomy must be used within <AstronomyProvider>');
  return ctx;
}
