import { describe, it, expect } from 'vitest';
import { beltRadius, beltRadiansPerDay, createBeltSamples } from './debrisBelts';
import { scaleAU } from '../astronomy/realisticScale';

describe('illustrative debris populations', () => {
  it('keeps the main belt between Mars and Jupiter in both projections', () => {
    for (const s of createBeltSamples('asteroid')) {
      expect(s.au).toBeGreaterThan(1.67);
      expect(s.au).toBeLessThan(4.95);
      expect(beltRadius('asteroid', s.au, false)).toBeGreaterThan(13);
      expect(beltRadius('asteroid', s.au, false)).toBeLessThan(20);
      expect(beltRadius('asteroid', s.au, true)).toBeCloseTo(scaleAU(s.au));
    }
  });
  it('keeps the outer belt beyond Neptune and gives both populations thickness', () => {
    for (const s of createBeltSamples('kuiper')) {
      expect(s.au).toBeGreaterThan(30.4);
      expect(beltRadius('kuiper', s.au, false)).toBeGreaterThan(37.5);
      expect(s.inclination).toBeLessThan(0.3);
    }
    for (const id of ['asteroid', 'kuiper'] as const) {
      const samples = createBeltSamples(id);
      expect(samples.filter(s => s.inclination > 0.05).length).toBeGreaterThan(samples.length / 3);
      expect(createBeltSamples(id)).toEqual(samples);
    }
  });
  it('uses slower prograde angular motion farther out, obeying Kepler rather than screen radius', () => {
    expect(beltRadiansPerDay(1) * 365.25).toBeCloseTo(2 * Math.PI);
    expect(beltRadiansPerDay(4) / beltRadiansPerDay(1)).toBeCloseTo(1 / 8);
    expect(beltRadiansPerDay(40)).toBeGreaterThan(0);
    expect(beltRadiansPerDay(40)).toBeLessThan(beltRadiansPerDay(3));
  });
});
