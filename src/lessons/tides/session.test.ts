import { describe, expect, it } from 'vitest';
import { isSameDestination, restoreExploration, snapshotExploration } from './session';
describe('tides exploration restoration', () => {
  it('restores the precise ref time before the original playback rate', () => {
    const saved = snapshotExploration(1790000000123, 86400, 'earth', 'orrery');
    const calls: unknown[] = [];
    restoreExploration(saved, (date) => calls.push(['date', date.getTime()]), (rate) => calls.push(['rate', rate]));
    expect(calls).toEqual([['date', 1790000000123], ['rate', 86400]]);
    expect(saved.timeMs).toBe(1790000000123);
  });
  it('detects external navigation or mode changes without overwriting their destination', () => {
    const saved = snapshotExploration(1000, 0, 'earth', 'artistic');
    expect(isSameDestination(saved, 'earth', 'artistic')).toBe(true);
    expect(isSameDestination(saved, 'mars', 'artistic')).toBe(false);
    expect(isSameDestination(saved, 'earth', 'orrery')).toBe(false);
    restoreExploration(saved, () => {}, () => {});
    expect(saved.rate).toBe(0);
  });
});
