import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { clearOrbitOccluder } from './orbitClearance';

const earth = new Vector3(4, 1, -2);
const moon = earth.clone().add(new Vector3(0.48, 0, 0));
const clearance = 0.335;
function segmentDistance(a: Vector3, b: Vector3, point: Vector3) {
  const segment = b.clone().sub(a);
  const t = Math.max(0, Math.min(1, point.clone().sub(a).dot(segment) / segment.lengthSq()));
  return a.clone().addScaledVector(segment, t).distanceTo(point);
}

describe('compact Moon camera clearance', () => {
  it('keeps both the camera and the Moon sightline outside Earth without changing zoom', () => {
    for (const distance of [0.175, 0.5, 0.57, 0.75, 2]) {
      for (let angle = 0; angle < 2 * Math.PI; angle += 0.1) {
        const position = moon.clone().add(new Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(distance));
        const result = new Vector3();
        clearOrbitOccluder(position, moon, earth, clearance, result);
        expect(result.distanceTo(moon)).toBeCloseTo(distance, 12);
        expect(segmentDistance(moon, result, earth)).toBeGreaterThanOrEqual(clearance - 1e-12);
      }
    }
  });
  it('leaves safe panning and zooming positions untouched', () => {
    const position = moon.clone().add(new Vector3(0.2, 0.3, 0.4));
    const result = new Vector3();
    expect(clearOrbitOccluder(position, moon, earth, clearance, result)).toBe(false);
    expect(result).toEqual(position);
  });
  it('handles direct Earthward alignment and a polar alignment without NaNs', () => {
    for (const axis of [new Vector3(1, 0, 0), new Vector3(0, 1, 0)]) {
      const target = earth.clone().addScaledVector(axis, 0.48);
      const position = target.clone().addScaledVector(axis, -0.5);
      const result = new Vector3();
      expect(clearOrbitOccluder(position, target, earth, clearance, result)).toBe(true);
      expect(result.distanceTo(target)).toBeCloseTo(0.5, 12);
      expect(segmentDistance(target, result, earth)).toBeGreaterThan(clearance);
      expect(clearOrbitOccluder(result.clone(), target, earth, clearance, result)).toBe(false);
    }
  });
  it('protects the camera while a flight target still passes through Earth', () => {
    const result = new Vector3();
    expect(clearOrbitOccluder(earth, earth, earth, clearance, result)).toBe(true);
    expect(result.distanceTo(earth)).toBeCloseTo(clearance, 12);
  });
});
