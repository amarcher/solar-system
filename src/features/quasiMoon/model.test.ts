import { describe, expect, it } from 'vitest';
import { companionPosition, earthFrame, heliocentric, relativePath, sceneVector } from './model';
import { replayDate, replayDayFromDate } from './types';

describe('Kamoʻoalewa replay', () => {
  it('uses the saved first year, then continues into later dates', () => {
    expect(replayDate(0)).toBe('8 Nov 2026');
    expect(replayDate(365)).toBe('8 Nov 2027');
    expect(replayDate(731)).toBe('8 Nov 2028');
    expect(replayDayFromDate('2028-11-08')).toBe(731);
    expect(heliocentric(-5)).toEqual(heliocentric(0));
    expect(heliocentric(NaN)).toEqual(heliocentric(0));
    expect(companionPosition(365)).toEqual(heliocentric(365).asteroid);
    expect(Math.hypot(...companionPosition(365.001).map((value, axis) => value - companionPosition(365)[axis]))).toBeLessThan(0.0001);
    expect(companionPosition(730)[0]).toBeCloseTo(0.6058445203, 9);
    expect(companionPosition(730)[1]).toBeCloseTo(0.6881312299, 9);
    expect(companionPosition(730)[2]).toBeCloseTo(-0.0363764257, 9);
  });
  it('keeps Earth at the origin and the Sun on the negative x axis throughout the year', () => {
    for (let day = 0; day <= 365; day += 7.3) {
      const { earth } = heliocentric(day);
      expect(Math.hypot(...earthFrame(earth, earth))).toBe(0);
      const sun = earthFrame(earth, [0, 0, 0]);
      expect(sun[0]).toBeLessThan(-.98);
      expect(Math.abs(sun[1])).toBeLessThan(1e-12);
    }
  });
  it('preserves physical distance under the change of viewpoint', () => {
    for (let day = 0; day <= 365; day += 2.5) {
      const { earth, asteroid } = heliocentric(day);
      expect(Math.hypot(...earthFrame(earth, asteroid))).toBeCloseTo(Math.hypot(...asteroid.map((n, i) => n - earth[i])), 12);
    }
  });
  it('traces a retrograde near-loop instead of inventing a closed satellite ellipse', () => {
    let turn = 0;
    for (let i = 1; i < relativePath.length; i++) {
      const before = Math.atan2(-relativePath[i - 1][2], relativePath[i - 1][0]);
      const after = Math.atan2(-relativePath[i][2], relativePath[i][0]);
      turn += Math.atan2(Math.sin(after - before), Math.cos(after - before));
    }
    expect(turn / (2 * Math.PI)).toBeCloseTo(-.994, 2);
    expect(relativePath[365]).not.toEqual(relativePath[0]);
    expect(Math.hypot(...relativePath[365].map((x, i) => x - relativePath[0][i]))).toBeLessThan(.007);
  });
  it('maps the ecliptic normal up with a right-handed scene basis', () => {
    expect(sceneVector([1, 2, 3])).toEqual([1, 3, -2]);
  });
});
