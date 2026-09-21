import { beforeAll, describe, expect, it } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import { Vector3 } from 'three';
import { celestialRotationMatrix, equatorialToCartesian, equatorialToSkyUV, starAppearance } from './celestialCoordinates';
import { getCelestialRotation, getHeliocentricPosition, preload } from './AstronomyService';

beforeAll(preload);

const anchors = [
  { name: 'Polaris', ra: 37.95456, dec: 89.26411 },
  { name: 'Sirius', ra: 101.28716, dec: -16.71612 },
  { name: 'Orion / Betelgeuse', ra: 88.79294, dec: 7.40706 },
  { name: 'Galactic center', ra: 266.4051, dec: -28.9362 },
  { name: 'Southern Cross / Acrux', ra: 186.6496, dec: -63.0991 },
];
const observers = [
  { latitude: 42.447, longitude: -71.224, elevation: 50 },
  { latitude: -33.869, longitude: 151.209, elevation: 20 },
  { latitude: 0, longitude: 0, elevation: 0 },
  { latitude: 89, longitude: 180, elevation: 0 },
];

describe('shared celestial coordinates', () => {
  it('preserves NASA meridian, handedness, poles and wrap-around', () => {
    expect(equatorialToSkyUV(0, 0)).toEqual([0.5, 0.5]);
    expect(equatorialToSkyUV(90, 0)).toEqual([0.25, 0.5]);
    expect(equatorialToSkyUV(180, 0)).toEqual([0, 0.5]);
    expect(equatorialToSkyUV(270, 0)).toEqual([0.75, 0.5]);
    expect(equatorialToSkyUV(360, 90)).toEqual([0.5, 0]);
    expect(equatorialToSkyUV(-90, -90)).toEqual([0.75, 1]);
    for (const { ra, dec } of anchors) {
      const direction = new Vector3(...equatorialToCartesian(ra, dec));
      // Shader uses Three's bottom-up equirectangular texture coordinates.
      const shaderU = Math.atan2(direction.z, direction.x) / (2 * Math.PI) + 0.5;
      const shaderV = Math.asin(direction.y) / Math.PI + 0.5;
      const [u, y] = equatorialToSkyUV(ra, dec);
      expect(shaderU).toBeCloseTo(u, 10);
      expect(1 - shaderV).toBeCloseTo(y, 10);
    }
  });

  for (const date of ['2026-09-21T03:00:00Z', '2026-09-21T15:00:00Z', '2050-03-20T21:00:00Z']) {
    for (const observer of observers) {
      it(`matches independent Horizon calculations at ${date}, latitude ${observer.latitude}`, () => {
        const time = new Date(date);
        const matrix = celestialRotationMatrix(getCelestialRotation('horizon', time, observer), 'horizon');
        expect(matrix.determinant()).toBeCloseTo(1, 12);
        for (const { ra, dec } of anchors) {
          const actual = new Vector3(...equatorialToCartesian(ra, dec)).applyMatrix4(matrix);
          const eqj = Astronomy.VectorFromSphere(new Astronomy.Spherical(dec, ra, 1), time);
          const eqd = Astronomy.EquatorFromVector(Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(time), eqj));
          const expected = Astronomy.Horizon(time, new Astronomy.Observer(observer.latitude, observer.longitude, observer.elevation), eqd.ra, eqd.dec, '');
          const altitude = expected.altitude * Math.PI / 180;
          const azimuth = expected.azimuth * Math.PI / 180;
          expect(actual.x).toBeCloseTo(Math.cos(altitude) * Math.sin(azimuth), 10);
          expect(actual.y).toBeCloseTo(Math.sin(altitude), 10);
          expect(actual.z).toBeCloseTo(-Math.cos(altitude) * Math.cos(azimuth), 10);
        }
      });
    }
  }

  it('places north, east, up and below-horizon directions on the correct scene axes', () => {
    const time = new Date('2026-09-21T03:00:00Z');
    const observer = new Astronomy.Observer(42.447, -71.224, 50);
    const toHorizon = Astronomy.Rotation_EQJ_HOR(time, observer);
    const matrix = celestialRotationMatrix(toHorizon.rot, 'horizon');
    for (const [hor, expected] of [
      [[1, 0, 0], [0, 0, -1]], // north
      [[0, -1, 0], [1, 0, 0]], // east
      [[0, 0, 1], [0, 1, 0]], // zenith
      [[0, 0, -1], [0, -1, 0]], // nadir: clipped in Sky shaders
    ]) {
      const eqj = Astronomy.RotateVector(Astronomy.InverseRotation(toHorizon), new Astronomy.Vector(hor[0], hor[1], hor[2], Astronomy.MakeTime(time)));
      const result = new Vector3(eqj.x, eqj.z, -eqj.y).applyMatrix4(matrix);
      expect(result.distanceTo(new Vector3(...expected))).toBeLessThan(1e-12);
    }
  });

  it('uses the same ecliptic basis as the actual planet positions', () => {
    const time = new Date('2026-09-21T03:00:00Z');
    const matrix = celestialRotationMatrix(getCelestialRotation('ecliptic', time, observers[0]), 'ecliptic');
    for (const body of [Astronomy.Body.Earth, Astronomy.Body.Jupiter, Astronomy.Body.Neptune]) {
      const eqj = Astronomy.HelioVector(body, time);
      const direction = new Vector3(eqj.x, eqj.z, -eqj.y).applyMatrix4(matrix).normalize();
      const planet = getHeliocentricPosition(body.toLowerCase(), time);
      const expected = new Vector3(planet.x, planet.z, -planet.y).normalize();
      expect(direction.distanceTo(expected)).toBeLessThan(1e-12);
    }
    const equatorialPole = new Vector3(0, 1, 0).applyMatrix4(matrix);
    expect(Math.acos(equatorialPole.y) * 180 / Math.PI).toBeCloseTo(23.4393, 3);
  });

  it('keeps point sizes bounded while separating bright and faint stars', () => {
    const bright = starAppearance(-1.5);
    const faint = starAppearance(6.5);
    expect(bright.size).toBeGreaterThan(faint.size * 4);
    expect(bright.brightness).toBeGreaterThan(faint.brightness * 5);
    expect(starAppearance(-30)).toEqual(bright);
    expect(starAppearance(30)).toEqual(faint);
    expect(faint.size).toBeGreaterThanOrEqual(1);
  });
});
