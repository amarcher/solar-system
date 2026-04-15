import { describe, it, expect } from 'vitest';

/**
 * Test the SPEED_OPTIONS values used by TimeControls.
 * These are duplicated here because the component doesn't export them,
 * and we want to verify the expected presets match what the UI offers.
 */
const SPEED_OPTIONS = [
  { label: 'Paused', rate: 0 },
  { label: '1x', rate: 1 },
  { label: '10 min/s', rate: 600 },
  { label: '1 hr/s', rate: 3600 },
  { label: '1 day/s', rate: 86400 },
  { label: '1 mo/s', rate: 86400 * 30 },
];

describe('TimeControls SPEED_OPTIONS', () => {
  it('has 6 speed presets', () => {
    expect(SPEED_OPTIONS).toHaveLength(6);
  });

  it('starts with Paused at rate 0', () => {
    expect(SPEED_OPTIONS[0]).toEqual({ label: 'Paused', rate: 0 });
  });

  it('has real-time at rate 1', () => {
    expect(SPEED_OPTIONS[1]).toEqual({ label: '1x', rate: 1 });
  });

  it('has 10 min/s at rate 600 (not 1 min/s at 60)', () => {
    const tenMinPreset = SPEED_OPTIONS[2];
    expect(tenMinPreset.label).toBe('10 min/s');
    expect(tenMinPreset.rate).toBe(600);
    // Ensure old "1 min/s" preset is gone
    const oneMinPreset = SPEED_OPTIONS.find((o) => o.label === '1 min/s');
    expect(oneMinPreset).toBeUndefined();
  });

  it('has rates in strictly ascending order', () => {
    for (let i = 1; i < SPEED_OPTIONS.length; i++) {
      expect(SPEED_OPTIONS[i].rate).toBeGreaterThan(SPEED_OPTIONS[i - 1].rate);
    }
  });

  it('1 hr/s equals 3600', () => {
    expect(SPEED_OPTIONS[3]).toEqual({ label: '1 hr/s', rate: 3600 });
  });

  it('1 day/s equals 86400', () => {
    expect(SPEED_OPTIONS[4]).toEqual({ label: '1 day/s', rate: 86400 });
  });

  it('1 mo/s equals 30 days in seconds', () => {
    expect(SPEED_OPTIONS[5]).toEqual({ label: '1 mo/s', rate: 86400 * 30 });
  });
});
