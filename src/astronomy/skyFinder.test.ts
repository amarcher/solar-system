import { describe, expect, it } from 'vitest';
import { compassPoint, lookAtBody, openingLook, shortestTurn, sortForFinder, type SkyBody } from './skyFinder';

const body = (id: string, altitude: number, azimuth: number): SkyBody => ({ id, name: id, altitude, azimuth });

describe('sky finder', () => {
  it('names the eight compass points and wraps around north', () => {
    expect(compassPoint(0)).toBe('N');
    expect(compassPoint(44)).toBe('NE');
    expect(compassPoint(90)).toBe('E');
    expect(compassPoint(238)).toBe('SW');
    expect(compassPoint(350)).toBe('N');
    expect(compassPoint(-90)).toBe('W');
  });

  it('lists bodies brightest first and keeps unknown ones last', () => {
    const sorted = sortForFinder([body('neptune', 10, 0), body('comet', 10, 0), body('saturn', 10, 0), body('moon', 10, 0)]);
    expect(sorted.map((b) => b.id)).toEqual(['moon', 'saturn', 'neptune', 'comet']);
  });

  it('opens on the brightest planet that is clear of the horizon', () => {
    const bodies = [body('moon', 40, 90), body('venus', 2, 250), body('jupiter', 17, 86), body('saturn', 25, 238)];
    expect(openingLook(bodies, 51.5)).toEqual({ azimuth: 86, altitude: 20 });
  });

  it('opens on the Moon when no bright planet is up', () => {
    expect(openingLook([body('moon', 40, 90), body('venus', -10, 250), body('neptune', 50, 120)], 51.5)).toEqual({ azimuth: 90, altitude: 40 });
  });

  it('faces the ecliptic side of the sky when nothing is up', () => {
    expect(openingLook([body('venus', -10, 250)], 51.5)).toEqual({ azimuth: 180, altitude: 25 });
    expect(openingLook([], -33.9)).toEqual({ azimuth: 0, altitude: 25 });
  });

  it('keeps the horizon in frame when aiming at a body', () => {
    expect(lookAtBody({ azimuth: 10, altitude: 3 }).altitude).toBe(20);
    expect(lookAtBody({ azimuth: 10, altitude: 88 }).altitude).toBe(70);
    expect(lookAtBody({ azimuth: 10, altitude: 45 }).altitude).toBe(45);
  });

  it('turns the short way round', () => {
    const deg = Math.PI / 180;
    expect(shortestTurn(350 * deg, 10 * deg)).toBeCloseTo(20 * deg, 10);
    expect(shortestTurn(10 * deg, 350 * deg)).toBeCloseTo(-20 * deg, 10);
    expect(shortestTurn(0, 3 * Math.PI)).toBeCloseTo(Math.PI, 10);
    expect(shortestTurn(5 * Math.PI, 5 * Math.PI + 0.5)).toBeCloseTo(0.5, 10);
  });
});
