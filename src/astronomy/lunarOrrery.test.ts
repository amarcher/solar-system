import { beforeAll, describe, expect, it } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import { getPlanetById } from '../data/planets';
import { getMoonById } from '../data/moons';
import { moonFocusDistance, moonVisualRadius } from '../utils/moonFraming';
import { getHeliocentricPosition, getLunarEclipticPosition, preload } from './AstronomyService';
import { LUNAR_ORRERY_RADIUS, LUNAR_PATH_SEGMENTS, lunarOrreryPosition, nextLunarPathSample, sampleLunarOrreryPath } from './lunarOrrery';

beforeAll(() => preload());

describe('compact Earth–Moon Orrery profile', () => {
  it('keeps Earth and Moon clearly separated without changing Explore', () => {
    const earth = getPlanetById('earth')!;
    const moon = getMoonById('moon')!;
    const radius = moonVisualRadius(moon.diameter, moon.id, 'orrery');
    expect(radius / earth.visualRadius).toBeGreaterThan(0.25);
    expect(radius / earth.visualRadius).toBeLessThan(0.3);
    expect(moonVisualRadius(moon.diameter, moon.id, 'artistic')).toBe(0.13896);
    expect(LUNAR_ORRERY_RADIUS).toBeGreaterThan(earth.visualRadius + radius);
    expect(LUNAR_ORRERY_RADIUS + radius).toBeLessThan(0.85);
  });

  it.each([[1280, 720], [390, 844], [844, 390]])('keeps the smaller Moon readable when selected at %i×%i', (width, height) => {
    const radius = moonVisualRadius(3474, 'moon', 'orrery');
    const distance = moonFocusDistance(radius, 50, width, height);
    const diskPixels = Math.tan(Math.asin(radius / distance)) / Math.tan(25 * Math.PI / 180) * height;
    expect(diskPixels).toBeGreaterThan(140);
    expect(diskPixels).toBeLessThanOrEqual(240.00001);
    expect(distance).toBeGreaterThan(radius * 2);
  });

  it.each(['2000-01-01T12:00:00Z', '2024-04-08T18:00:00Z', '2026-09-21T00:00:00Z', '2030-06-10T12:00:00Z'])(
    'preserves the geocentric GeoMoon direction and inclined orbit for %s', iso => {
      const time = new Date(iso);
      const before = time.getTime();
      const direct = Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECL(), Astronomy.GeoMoon(time));
      const service = getLunarEclipticPosition(time);
      expect(service.x).toBeCloseTo(direct.x, 14);
      expect(service.y).toBeCloseTo(direct.y, 14);
      expect(service.z).toBeCloseTo(direct.z, 14);
      const position = lunarOrreryPosition(time);
      const trueLength = Math.hypot(direct.x, direct.y, direct.z);
      expect(Math.hypot(...position)).toBeCloseTo(LUNAR_ORRERY_RADIUS, 12);
      expect(position[0] / LUNAR_ORRERY_RADIUS).toBeCloseTo(direct.x / trueLength, 12);
      expect(position[1] / LUNAR_ORRERY_RADIUS).toBeCloseTo(direct.z / trueLength, 12);
      expect(position[2] / LUNAR_ORRERY_RADIUS).toBeCloseTo(-direct.y / trueLength, 12);
      expect(Math.abs(position[1])).toBeGreaterThan(0.001);
      expect(time.getTime()).toBe(before);
    },
  );

  it('uses the same J2000 ecliptic frame as heliocentric planet positions', () => {
    for (const year of [2000, 2026, 2100]) {
      const date = new Date(Date.UTC(year, 8, 21));
      const earth = getHeliocentricPosition('earth', date);
      const moon = getHeliocentricPosition('moon', date);
      const relative = getLunarEclipticPosition(date);
      expect(moon.x - earth.x).toBeCloseTo(relative.x, 13);
      expect(moon.y - earth.y).toBeCloseTo(relative.y, 13);
      expect(moon.z - earth.z).toBeCloseTo(relative.z, 13);
    }
  });

  it('has no accumulated playback phase: revisiting a date gives the same location', () => {
    const date = new Date('2026-09-21T00:00:00Z');
    const original = lunarOrreryPosition(date);
    lunarOrreryPosition(new Date('2040-01-01'));
    lunarOrreryPosition(new Date('1900-01-01'));
    expect(lunarOrreryPosition(date)).toEqual(original);
  });

  it('samples the orbit using exactly the body position mapping, centered on its epoch', () => {
    const epoch = Date.parse('2026-09-21T00:00:00Z');
    const path = sampleLunarOrreryPath(epoch);
    expect(path.length).toBe((LUNAR_PATH_SEGMENTS + 1) * 3);
    const middle = LUNAR_PATH_SEGMENTS / 2 * 3;
    const body = lunarOrreryPosition(new Date(epoch));
    body.forEach((coordinate, axis) => expect(path[middle + axis]).toBeCloseTo(coordinate, 7));
    for (let i = 0; i < path.length; i += 3) {
      expect(Math.hypot(path[i], path[i + 1], path[i + 2])).toBeCloseTo(LUNAR_ORRERY_RADIUS, 6);
    }
    const elevations = Array.from({ length: LUNAR_PATH_SEGMENTS + 1 }, (_, i) => path[i * 3 + 1]);
    expect(Math.max(...elevations)).toBeGreaterThan(0.02);
    expect(Math.min(...elevations)).toBeLessThan(-0.02);
  });

  it('reuses a path within a simulation day and throttles fast playback, including reverse', () => {
    const t = Date.parse('2026-09-21T00:00:00Z');
    const initial = nextLunarPathSample(null, t, 0, false)!;
    expect(nextLunarPathSample(initial, t + 1000, 4000, false)).toBeNull();
    expect(nextLunarPathSample(initial, t + 86_400_000, 16, false)).toBeNull();
    expect(nextLunarPathSample(initial, t - 86_400_000, 32, false)).toBeNull();
    expect(nextLunarPathSample(initial, t + 86_400_000, 1000, false)?.epochMs).toBe(t + 86_400_000);
    expect(nextLunarPathSample(initial, t - 86_400_000, 1000, false)?.epochMs).toBe(t - 86_400_000);
    expect(nextLunarPathSample(initial, t + 86_400_000, 16, true)?.epochMs).toBe(t + 86_400_000);
  });
});
