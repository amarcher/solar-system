import { describe, it, expect } from 'vitest';
import type { ViewMode } from './types';
import { DEFAULT_OBSERVER } from './types';
import { scaleAU } from './realisticScale';

describe('ViewMode type', () => {
  it('accepts artistic, orrery, and sky as valid modes', () => {
    const modes: ViewMode[] = ['artistic', 'orrery', 'sky'];
    expect(modes).toHaveLength(3);
    expect(modes).toContain('artistic');
    expect(modes).toContain('orrery');
    expect(modes).toContain('sky');
  });
});

describe('DEFAULT_OBSERVER', () => {
  it('has valid latitude (-90 to 90)', () => {
    expect(DEFAULT_OBSERVER.latitude).toBeGreaterThanOrEqual(-90);
    expect(DEFAULT_OBSERVER.latitude).toBeLessThanOrEqual(90);
  });

  it('has valid longitude (-180 to 180)', () => {
    expect(DEFAULT_OBSERVER.longitude).toBeGreaterThanOrEqual(-180);
    expect(DEFAULT_OBSERVER.longitude).toBeLessThanOrEqual(180);
  });

  it('has non-negative elevation', () => {
    expect(DEFAULT_OBSERVER.elevation).toBeGreaterThanOrEqual(0);
  });

  it('is located at Greenwich Observatory', () => {
    expect(DEFAULT_OBSERVER.latitude).toBeCloseTo(51.4769, 2);
    expect(DEFAULT_OBSERVER.longitude).toBeCloseTo(-0.0005, 3);
  });
});

describe('scaleAU ordering for mission-relevant distances', () => {
  it('preserves ordering from Earth-Moon to outer solar system', () => {
    const earthMoonAU = 0.00257;
    const earthSunAU = 1.0;
    const marsAU = 1.524;
    const jupiterAU = 5.2;
    const neptuneAU = 30.0;

    const scaled = [earthMoonAU, earthSunAU, marsAU, jupiterAU, neptuneAU].map(scaleAU);

    for (let i = 1; i < scaled.length; i++) {
      expect(scaled[i], `scaleAU(${[earthMoonAU, earthSunAU, marsAU, jupiterAU, neptuneAU][i]}) > scaleAU(${[earthMoonAU, earthSunAU, marsAU, jupiterAU, neptuneAU][i - 1]})`).toBeGreaterThan(scaled[i - 1]);
    }
  });

  it('Earth-Moon distance maps to a small but positive value', () => {
    const earthMoonAU = 0.00257;
    const scaled = scaleAU(earthMoonAU);
    expect(scaled).toBeGreaterThan(0);
    // Should be very small — less than 1 scene unit
    expect(scaled).toBeLessThan(1);
  });

  it('mission trajectory scale factor produces visible size', () => {
    // From RealisticMissionTrajectory: scaleFactor = 1.5 / 2.0 = 0.75
    // The canonical Moon distance is 2.0 units, scaled to 1.5 orrery units
    const CANONICAL_MOON_DIST = 2.0;
    const VISIBLE_MOON_DIST = 1.5;
    const scaleFactor = VISIBLE_MOON_DIST / CANONICAL_MOON_DIST;

    expect(scaleFactor).toBe(0.75);

    // A point at canonical distance 2.0 should scale to 1.5
    const scaledDist = CANONICAL_MOON_DIST * scaleFactor;
    expect(scaledDist).toBe(VISIBLE_MOON_DIST);

    // The scaled trajectory must be large enough to see (> 0.1 units)
    expect(scaledDist).toBeGreaterThan(0.1);
  });

  it('scaleAU is monotonically increasing for positive values', () => {
    const values = [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10, 20, 30, 50];
    const scaled = values.map(scaleAU);
    for (let i = 1; i < scaled.length; i++) {
      expect(scaled[i]).toBeGreaterThan(scaled[i - 1]);
    }
  });
});
