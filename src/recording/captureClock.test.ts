import { describe, expect, it, vi } from 'vitest';
import { borrowCaptureClock } from './captureClock';
describe('capture clock restoration', () => {
  it.each([0, 3600])('restores exact time before the original playback rate %s, once', rate => {
    const calls: unknown[] = [];
    const timeRef = { current: 1790000000123 };
    const setRate = vi.fn(rate => calls.push(rate));
    const setDate = vi.fn(date => calls.push(date.getTime()));
    const restore = borrowCaptureClock({ timeRef, rate, setRate, setDate });
    timeRef.current += 100;
    restore(); restore();
    expect(calls).toEqual([0, 1790000000123, rate]);
    expect(setDate).toHaveBeenCalledOnce();
  });
});
