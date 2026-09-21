import { Vector3 } from 'three';

/** Fit the real bodies and enlarged tide arrows in the portrait's uncovered
 * rectangle. Only the camera moves; all world positions and viewing directions
 * stay unchanged. Sphere bounds include depth, so this also works when a body
 * lies toward the camera rather than in a flat, invented teaching plane. */
export function tidesCaptureFraming(
  earth: Vector3, moon: Vector3, viewingDirection: Vector3, screenUp: Vector3,
  earthRadius: number, moonRadius: number, fov = 50,
) {
  const tan = Math.tan(fov * Math.PI / 360);
  const aspect = 9 / 16;
  const centerY = 1 - 2 * 536 / 1280;
  const right = new Vector3().crossVectors(screenUp, viewingDirection).normalize();
  const up = new Vector3().crossVectors(viewingDirection, right).normalize();
  const bodies = [
    { offset: new Vector3(), radius: earthRadius * 1.8 },
    { offset: moon.clone().sub(earth), radius: moonRadius },
  ].map(({ offset, radius }) => ({ x: offset.dot(right), y: offset.dot(up), z: offset.dot(viewingDirection), radius }));
  const centerX = (Math.min(...bodies.map(b => b.x - b.radius)) + Math.max(...bodies.map(b => b.x + b.radius))) / 2;
  const centerUp = (Math.min(...bodies.map(b => b.y - b.radius)) + Math.max(...bodies.map(b => b.y + b.radius))) / 2;
  let distance = earthRadius * 5 + 2;
  for (const body of bodies) {
    const near = body.z + body.radius;
    distance = Math.max(distance,
      near + (Math.abs(body.x - centerX) + body.radius) / (0.9 * aspect * tan),
      near + (Math.abs(body.y - centerUp) + body.radius + Math.abs(centerY) * tan * (Math.abs(body.z) + body.radius)) / (0.5 * tan));
  }
  const target = earth.clone().addScaledVector(right, centerX).addScaledVector(up, centerUp - centerY * tan * distance);
  return { target, position: target.clone().addScaledVector(viewingDirection, distance) };
}
