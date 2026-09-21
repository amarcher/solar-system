import { Vector3 } from 'three';

/** Keep an orbit's view segment outside an occluding sphere. For an external
 * target, preserve viewing distance and choose the nearest safe orbit direction. */
export function clearOrbitOccluder(position: Vector3, target: Vector3, center: Vector3, radius: number, out: Vector3): boolean {
  out.copy(position);
  const axis = target.clone().sub(center);
  const separation = axis.length();
  const offset = position.clone().sub(target);
  const distance = offset.length();
  // During a flight the interpolated target can still be inside Earth. Only
  // protect the camera itself until a clear target-to-camera segment is possible.
  if (separation <= radius || distance < 1e-9) {
    const radial = position.clone().sub(center);
    if (radial.lengthSq() >= radius * radius) return false;
    if (radial.lengthSq() < 1e-18) radial.set(0, 1, 0);
    out.copy(center).addScaledVector(radial.normalize(), radius);
    return true;
  }
  axis.divideScalar(separation);
  offset.divideScalar(distance);
  const tangentDistance = Math.sqrt(separation * separation - radius * radius);
  const minimumDot = distance >= tangentDistance
    ? -tangentDistance / separation
    : (radius * radius - separation * separation - distance * distance) / (2 * separation * distance);
  const currentDot = offset.dot(axis);
  if (currentDot >= minimumDot || minimumDot <= -1) return false;
  // A small angular margin avoids repeated corrections from round-off.
  const safeDot = Math.min(1, minimumDot + 1e-6);
  offset.addScaledVector(axis, -currentDot);
  if (offset.lengthSq() < 1e-18) {
    offset.set(0, 1, 0);
    if (Math.abs(axis.y) > 0.9) offset.set(1, 0, 0);
    offset.addScaledVector(axis, -offset.dot(axis));
  }
  offset.normalize().multiplyScalar(Math.sqrt(1 - safeDot * safeDot)).addScaledVector(axis, safeDot);
  out.copy(target).addScaledVector(offset, distance);
  return true;
}
