import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { addDifferentialField, gravityInDirection } from './inlineTidesMath';
import { SOLAR_TIDE_RATIO } from './model';

describe('live directional tide fields', () => {
  it('follows any three-dimensional body direction without changing physical strength', () => {
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(1, 2, 3).normalize(), 1.3);
    const surface = new Vector3(0, 1, 0), moon = new Vector3(1, 0, 0);
    const original = addDifferentialField(new Vector3(), surface, moon, 1);
    const rotated = addDifferentialField(new Vector3(), surface.clone().applyQuaternion(rotation), moon.clone().applyQuaternion(rotation), 1);
    expect(rotated.distanceTo(original.applyQuaternion(rotation))).toBeLessThan(1e-12);
  });
  it('keeps actual attraction toward the live body on near and far sides', () => {
    const direction = new Vector3(1, 2, -3).normalize();
    const near = gravityInDirection(new Vector3(), direction, direction, 'moon');
    const far = gravityInDirection(new Vector3(), direction.clone().negate(), direction, 'moon');
    expect(near.dot(direction)).toBeGreaterThan(0);
    expect(far.dot(direction)).toBeGreaterThan(0);
    expect(near.length()).toBeGreaterThan(far.length());
    expect(addDifferentialField(new Vector3(), direction.clone().negate(), direction, 1).dot(direction)).toBeLessThan(0);
  });
  it('combines separately oriented Sun and Moon fields with fixed tidal weights', () => {
    const moon = new Vector3(0, 0, 1), sun = new Vector3(0, 1, 0);
    const alongMoon = addDifferentialField(new Vector3(), moon, moon, 1);
    addDifferentialField(alongMoon, moon, sun, SOLAR_TIDE_RATIO);
    const alongSun = addDifferentialField(new Vector3(), sun, moon, 1);
    addDifferentialField(alongSun, sun, sun, SOLAR_TIDE_RATIO);
    expect(alongMoon.z).toBeCloseTo(2 - SOLAR_TIDE_RATIO);
    expect(alongSun.y).toBeCloseTo(-1 + 2 * SOLAR_TIDE_RATIO);
    expect(alongMoon.x).toBe(0);
    expect(alongSun.x).toBe(0);
  });
});
