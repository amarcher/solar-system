import type { RefObject } from 'react';

export type QuasiMoonView = 'earth' | 'sun';
export interface QuasiMoonPlayback {
  dayRef: RefObject<number>;
  view: QuasiMoonView;
  playing: boolean;
}
export const REPLAY_START = Date.UTC(2026, 10, 8);
export const REPLAY_DAYS = 365;
export const REPLAY_SECONDS = 18;

const MS_PER_DAY = 86_400_000;

export function replayDay(day: number): number {
  return Number.isFinite(day) ? Math.max(0, day) : 0;
}

export function replayDate(day: number): string {
  return new Date(REPLAY_START + replayDay(day) * MS_PER_DAY)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function replayDateInputValue(day: number): string {
  return new Date(REPLAY_START + replayDay(day) * MS_PER_DAY).toISOString().slice(0, 10);
}

export function replayDayFromDate(value: string): number {
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) ? replayDay((time - REPLAY_START) / MS_PER_DAY) : 0;
}
