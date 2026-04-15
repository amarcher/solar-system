import { describe, it, expect, beforeAll } from 'vitest';
import {
  preload,
  isReady,
  getHeliocentricPosition,
  getGeocentricPosition,
  getHorizontalPosition,
  getMoonPhase,
  getSiderealTime,
} from './AstronomyService';

beforeAll(async () => {
  await preload();
});

describe('AstronomyService', () => {
  it('loads astronomy-engine successfully', () => {
    expect(isReady()).toBe(true);
  });

  describe('getHeliocentricPosition', () => {
    it('returns a position for Earth', () => {
      const pos = getHeliocentricPosition('earth', new Date('2024-03-20T00:00:00Z'));
      expect(pos.x).toBeTypeOf('number');
      expect(pos.y).toBeTypeOf('number');
      expect(pos.z).toBeTypeOf('number');
      // Earth is ~1 AU from Sun
      const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
      expect(dist).toBeGreaterThan(0.98);
      expect(dist).toBeLessThan(1.02);
    });

    it('returns positions for all supported planets', () => {
      const bodies = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
      const date = new Date('2024-06-15T12:00:00Z');
      for (const body of bodies) {
        const pos = getHeliocentricPosition(body, date);
        const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
        expect(dist, `${body} should have nonzero distance from Sun`).toBeGreaterThan(0);
      }
    });

    it('Mars is further from the Sun than Earth', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const earth = getHeliocentricPosition('earth', date);
      const mars = getHeliocentricPosition('mars', date);
      const earthDist = Math.sqrt(earth.x ** 2 + earth.y ** 2 + earth.z ** 2);
      const marsDist = Math.sqrt(mars.x ** 2 + mars.y ** 2 + mars.z ** 2);
      expect(marsDist).toBeGreaterThan(earthDist);
    });

    it('throws for unknown body', () => {
      expect(() => getHeliocentricPosition('deathstar', new Date())).toThrow('Unknown body');
    });
  });

  describe('getGeocentricPosition', () => {
    it('returns RA/Dec for the Moon', () => {
      const pos = getGeocentricPosition('moon', new Date('2024-06-15T12:00:00Z'));
      expect(pos.ra).toBeGreaterThanOrEqual(0);
      expect(pos.ra).toBeLessThan(24);
      expect(pos.dec).toBeGreaterThanOrEqual(-90);
      expect(pos.dec).toBeLessThanOrEqual(90);
      expect(pos.dist).toBeGreaterThan(0);
    });
  });

  describe('getHorizontalPosition', () => {
    it('returns altitude/azimuth for the Sun from Greenwich', () => {
      const observer = { latitude: 51.4769, longitude: -0.0005, elevation: 0 };
      const pos = getHorizontalPosition('sun', new Date('2024-06-21T12:00:00Z'), observer);
      expect(pos.altitude).toBeTypeOf('number');
      expect(pos.azimuth).toBeGreaterThanOrEqual(0);
      expect(pos.azimuth).toBeLessThan(360);
      // Sun at noon on summer solstice in London should be well above horizon
      expect(pos.altitude).toBeGreaterThan(30);
    });

    it('Sun is below horizon at midnight in winter', () => {
      const observer = { latitude: 51.4769, longitude: -0.0005, elevation: 0 };
      const pos = getHorizontalPosition('sun', new Date('2024-12-21T00:00:00Z'), observer);
      expect(pos.altitude).toBeLessThan(0);
    });
  });

  describe('getMoonPhase', () => {
    it('returns a value between 0 and 360', () => {
      const phase = getMoonPhase(new Date('2024-06-15T12:00:00Z'));
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(360);
    });
  });

  describe('getSiderealTime', () => {
    it('returns a value between 0 and 24', () => {
      const gst = getSiderealTime(new Date('2024-06-15T12:00:00Z'));
      expect(gst).toBeGreaterThanOrEqual(0);
      expect(gst).toBeLessThan(24);
    });
  });
});
