export interface ExplorationSnapshot { timeMs: number; rate: number; navKey: string; mode: string }
export function snapshotExploration(timeMs: number, rate: number, navKey: string, mode: string): ExplorationSnapshot {
  return { timeMs, rate, navKey, mode };
}
export function isSameDestination(snapshot: ExplorationSnapshot, navKey: string, mode: string): boolean {
  return snapshot.navKey === navKey && snapshot.mode === mode;
}
/** Restore time before playback. Navigation is deliberately never restored. */
export function restoreExploration(snapshot: ExplorationSnapshot, setDate: (date: Date) => void, setRate: (rate: number) => void): void {
  setDate(new Date(snapshot.timeMs));
  setRate(snapshot.rate);
}
