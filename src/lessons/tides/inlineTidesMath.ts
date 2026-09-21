import { Vector3 } from 'three';
import { EARTH_RADIUS_KM, TIDE_BODIES } from './model';

/** Add a leading-order tidal field in a shared, uncompressed directional frame. */
export function addDifferentialField(target: Vector3, surface: Vector3, direction: Vector3, weight: number): Vector3 {
  return target.addScaledVector(direction, weight * 3 * surface.dot(direction)).addScaledVector(surface, -weight);
}

/** Attraction normalized to this body's Earth-center acceleration. Display
 * direction is live; distance is representative physical km, never scene units. */
export function gravityInDirection(target: Vector3, surface: Vector3, direction: Vector3, body: 'moon' | 'sun'): Vector3 {
  target.copy(direction).addScaledVector(surface, -EARTH_RADIUS_KM / TIDE_BODIES[body].distance);
  return target.multiplyScalar(1 / target.length() ** 3);
}
