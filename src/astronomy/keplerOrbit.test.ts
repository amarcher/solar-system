import { describe, expect, it } from 'vitest';
import { keplerPath, keplerPosition, toJulianDate, type KeplerElements } from './keplerOrbit';
import { getHeliocentricPosition } from './AstronomyService';
import orbits from '../data/rubinAsteroidOrbits.json';

const distance = (p: { x: number; y: number; z: number }) => Math.hypot(p.x, p.y, p.z);

describe('keplerPosition', () => {
  it('keeps Ceres where the previous dedicated propagator put it', () => {
    // Values recorded from the Ceres-only implementation this module replaced.
    const cases: [string, [number, number, number]][] = [
      ['2020-01-01T00:00:00Z', [1.0031748070441204, -2.7268463675839847, -0.2711346805222321]],
      ['2026-05-15T00:00:00Z', [1.6355193185619266, 2.244490664253081, -0.23025118622448357]],
      ['2031-07-04T12:00:00Z', [-0.32572595460796583, 2.607340134328236, 0.1425478133535528]],
    ];
    for (const [date, [x, y, z]] of cases) {
      const p = getHeliocentricPosition('ceres', new Date(date));
      expect(p.x).toBeCloseTo(x, 9);
      expect(p.y).toBeCloseTo(y, 9);
      expect(p.z).toBeCloseTo(z, 9);
    }
  });

  it('sits at perihelion distance at the time of perihelion', () => {
    for (const el of Object.values(orbits) as KeplerElements[]) {
      const p = keplerPosition(el, (el.tpJd - 2440587.5) * 86_400_000);
      expect(distance(p)).toBeCloseTo(el.q, 6);
    }
  });

  it('keeps a closed orbit between perihelion and aphelion', () => {
    const el = orbits['2025 LS2'];
    const aphelion = (el.q / (1 - el.e)) * (1 + el.e);
    for (const year of [2000, 2026, 2100]) {
      const r = distance(keplerPosition(el, new Date(`${year}-01-01T00:00:00Z`)));
      expect(r).toBeGreaterThanOrEqual(el.q - 1e-6);
      expect(r).toBeLessThanOrEqual(aphelion + 1e-6);
    }
  });

  it('sends 3I/ATLAS away from the Sun after perihelion and never back', () => {
    const el = orbits['C/2025 N1'];
    const r2026 = distance(keplerPosition(el, new Date('2026-09-28T00:00:00Z')));
    const r2030 = distance(keplerPosition(el, new Date('2030-01-01T00:00:00Z')));
    expect(r2026).toBeGreaterThan(el.q);
    expect(r2030).toBeGreaterThan(r2026);
  });

  it('places Earth\'s quasi-moon 2025 PN7 near Earth\'s orbit', () => {
    const r = distance(keplerPosition(orbits['2025 PN7'], new Date('2026-09-28T00:00:00Z')));
    expect(r).toBeGreaterThan(0.85);
    expect(r).toBeLessThan(1.15);
  });
});

describe('keplerPath', () => {
  it('closes ellipses and clips hyperbolas to the requested distance', () => {
    expect(keplerPath(orbits['2025 MN45'], 64)).toHaveLength(64);
    const path = keplerPath(orbits['C/2025 N1'], 65, 20);
    expect(distance(path[0])).toBeCloseTo(20, 6);
    expect(distance(path[64])).toBeCloseTo(20, 6);
    expect(distance(path[32])).toBeCloseTo(orbits['C/2025 N1'].q, 6);
  });
});

describe('toJulianDate', () => {
  it('matches the J2000 epoch', () => {
    expect(toJulianDate(new Date('2000-01-01T12:00:00Z'))).toBe(2451545);
  });
});
