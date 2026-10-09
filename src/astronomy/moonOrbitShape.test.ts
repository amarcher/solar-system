import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { getMoonById, getMoonsByPlanet } from '../data/moons';
import { getPlanetById } from '../data/planets';
import { orreryMoonOrbitRadius } from './moonSpacing';
import { MOON_PATH_SEGMENTS, moonOrbitPath, moonOrbitPoint, moonOrbitReach, moonOrbitShape, moonSpinHours } from './moonOrbitShape';

const TWO_PI = Math.PI * 2;
const sample = (id: string, meanAnomaly: number) => {
  const moon = getMoonById(id)!;
  return moonOrbitPoint(moonOrbitShape(moon)!, orreryMoonOrbitRadius(moon), meanAnomaly, new Vector3());
};

describe('captured moon orbit shape', () => {
  it('leaves near-circular, equatorial moons on their flat circle', () => {
    for (const id of ['io', 'callisto', 'triton', 'moon']) {
      expect(moonOrbitShape(getMoonById(id)!)).toBeNull();
      expect(moonOrbitReach(getMoonById(id)!)).toBe(0);
    }
  });

  it('lifts a tilted moon out of the plane by its inclination and no further', () => {
    for (const id of ['himalia', 'valetudo', 'carme', 'pasiphae']) {
      const moon = getMoonById(id)!;
      const tilt = Math.min(moon.orbitInclination!, 180 - moon.orbitInclination!) * Math.PI / 180;
      let steepest = 0;
      for (let i = 0; i < 720; i++) {
        const p = sample(id, i / 720 * TWO_PI);
        steepest = Math.max(steepest, Math.abs(Math.asin(p.y / p.length())));
      }
      expect(steepest).toBeCloseTo(tilt, 3);
    }
  });

  it('keeps the displayed distance between compressed periapsis and apoapsis', () => {
    const moon = getMoonById('pasiphae')!;
    const radius = orreryMoonOrbitRadius(moon);
    const scale = getPlanetById('jupiter')!.visualRadius * 0.6;
    const distances = Array.from({ length: 720 }, (_, i) => sample('pasiphae', i / 720 * TWO_PI).length());
    expect(Math.min(...distances)).toBeCloseTo(radius + scale * Math.log2(1 - 0.412), 6);
    expect(Math.max(...distances)).toBeCloseTo(radius + moonOrbitReach(moon), 4);
    expect(sample('pasiphae', 0).length()).toBeCloseTo(Math.min(...distances), 6);
  });

  it('sweeps retrograde moons the opposite way round from prograde ones', () => {
    const sweep = (id: string) => {
      const moon = getMoonById(id)!;
      const direction = moon.retrograde ? 1 : -1;
      const a = sample(id, 0.2 * direction), b = sample(id, 0.3 * direction);
      return Math.sign(a.z * b.x - a.x * b.z); // +1 = counterclockwise seen from above (+Y)
    };
    expect(sweep('himalia')).toBe(1);
    expect(sweep('valetudo')).toBe(1);
    expect(sweep('carme')).toBe(-1);
    expect(sweep('pasiphae')).toBe(-1);
  });

  it('never draws a captured moon inside Callisto, and lets Valetudo cross the backwards moons', () => {
    const range = (id: string) => {
      const moon = getMoonById(id)!;
      const path = moonOrbitPath(moonOrbitShape(moon)!, orreryMoonOrbitRadius(moon));
      expect(path.length).toBe(MOON_PATH_SEGMENTS * 3);
      const d = Array.from({ length: MOON_PATH_SEGMENTS }, (_, i) => Math.hypot(path[i * 3], path[i * 3 + 1], path[i * 3 + 2]));
      return [Math.min(...d), Math.max(...d)];
    };
    const callisto = orreryMoonOrbitRadius(getMoonById('callisto')!);
    for (const moon of getMoonsByPlanet('jupiter').filter(m => moonOrbitShape(m))) expect(range(moon.id)[0]).toBeGreaterThan(callisto);
    // Real distances overlap too: Valetudo reaches 22.7 million km, Carme comes in to 17.1 million km.
    expect(range('valetudo')[1]).toBeGreaterThan(range('carme')[0]);
  });

  it('spins a moon with unknown rotation at the nominal rate instead of pretending it is tidally locked', () => {
    expect(moonSpinHours(getMoonById('himalia')!)).toBe(7.78);
    expect(moonSpinHours(getMoonById('carme')!)).toBe(10);
    expect(moonSpinHours(getMoonById('io')!)).toBeCloseTo(getMoonById('io')!.orbitalPeriod * 24);
  });
});
