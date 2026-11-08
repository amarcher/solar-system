import type { RefObject } from 'react';

export type QuasiMoonView = 'earth' | 'sun';
export interface QuasiMoonPlayback {
  dayRef: RefObject<number>;
  view: QuasiMoonView;
  playing: boolean;
  onComplete: () => void;
}
export const REPLAY_START = Date.UTC(2026, 10, 8);
export const REPLAY_DAYS = 365;
export const REPLAY_SECONDS = 18;
export function replayDate(day: number): string {
  return new Date(REPLAY_START + Math.max(0, Math.min(REPLAY_DAYS, day)) * 86400000)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
