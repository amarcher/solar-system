export interface CaptureClock {
  timeRef: { current: number };
  rate: number;
  setRate: (rate: number) => void;
  setDate: (date: Date) => void;
}
/** Freeze immediately, then restore exact simulation time before resuming playback.
 * The lease owns no navigation or view mode and is safe on repeated exit paths. */
export function borrowCaptureClock(clock: CaptureClock): () => void {
  const time = clock.timeRef.current;
  const rate = clock.rate;
  clock.setRate(0);
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    clock.setDate(new Date(time));
    clock.setRate(rate);
  };
}
