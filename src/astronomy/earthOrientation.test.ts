import { beforeAll, describe, expect, it } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import { Vector3 } from 'three';
import { celestialRotationMatrix } from './celestialCoordinates';
import { getEarthEquatorialRotation, getHeliocentricPosition, getSiderealTime, preload } from './AstronomyService';

beforeAll(preload);

function surfaceDirection(time: Date, latitude: number, longitude: number): Vector3 {
  const lat = latitude * Math.PI / 180;
  const angle = (getSiderealTime(time) * 15 + longitude) * Math.PI / 180;
  return new Vector3(Math.cos(lat) * Math.cos(angle), Math.sin(lat), -Math.cos(lat) * Math.sin(angle))
    .applyMatrix4(celestialRotationMatrix(getEarthEquatorialRotation(time), 'ecliptic'));
}

describe('Orrery Earth orientation', () => {
  for (const date of ['1900-03-21T00:00:00Z', '2026-03-21T00:00:00Z', '2026-06-21T06:00:00Z', '2026-09-21T12:00:00Z', '2026-12-21T18:00:00Z', '2050-03-21T00:00:00Z']) {
    it(`matches independent terrestrial observer directions at ${date}`, () => {
      const time = new Date(date);
      // Equator and poles avoid comparing spherical mesh latitude with the
      // geodetic latitude of the engine's oblate Earth observer model.
      for (const [latitude, longitude] of [[0, 0], [0, 90], [0, -90], [90, 0], [-90, 0]]) {
        const observer = new Astronomy.Observer(latitude, longitude, 0);
        const eqj = Astronomy.ObserverVector(time, observer, false);
        const ecliptic = Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECL(), eqj);
        const expected = new Vector3(ecliptic.x, ecliptic.z, -ecliptic.y).normalize();
        expect(surfaceDirection(time, latitude, longitude).distanceTo(expected)).toBeLessThan(1e-10);
      }
    });
  }

  it('tilts the northern pole toward the Sun in June and away in December', () => {
    for (const [date, declination] of [['2026-06-21T00:00:00Z', 23.44], ['2026-12-21T00:00:00Z', -23.44]] as const) {
      const time = new Date(date);
      const earth = getHeliocentricPosition('earth', time);
      const toSun = new Vector3(-earth.x, -earth.z, earth.y).normalize();
      const pole = surfaceDirection(time, 90, 0);
      expect(Math.asin(pole.dot(toSun)) * 180 / Math.PI).toBeCloseTo(declination, 1);
    }
  });
});
