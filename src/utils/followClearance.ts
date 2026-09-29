import { Vector3 } from 'three';

/** Something the follow camera shouldn't frame behind (or in front of) its target. */
export interface BackgroundBody {
  position: Vector3;
  /** Visual radius including rings and a margin for the label. */
  radius: number;
}

/**
 * Candidate camera directions as (turn from the Sun line around +Y, lift), in
 * preference order. The first is the original sunlit framing: about 70° off the
 * Sun line and a little above, so low sunlight rakes across the craters. A clear
 * background keeps exactly that shot.
 */
const CANDIDATES: ReadonlyArray<readonly [number, number]> = [
  [1.2, 0.45], [-1.2, 0.45],
  [0.8, 0.45], [-0.8, 0.45],
  [1.2, 0.9], [-1.2, 0.9],
  [1.6, 0.3], [-1.6, 0.3],
  [1.2, 0.1], [-1.2, 0.1],
];

const UP = new Vector3(0, 1, 0);
const scratch = { dir: new Vector3(), camera: new Vector3(), look: new Vector3(), toBody: new Vector3() };

/**
 * Angular room (radians) between the frame edge and the nearest body disc for a
 * camera at `camera` looking at `target`. Negative means a body intrudes.
 */
function frameMargin(camera: Vector3, target: Vector3, bodies: readonly BackgroundBody[], halfFov: number): number {
  const { look, toBody } = scratch;
  look.subVectors(target, camera).normalize();
  let margin = Infinity;
  for (const body of bodies) {
    toBody.subVectors(body.position, camera);
    const distance = toBody.length();
    if (distance <= body.radius) return -Math.PI; // camera inside the body
    const along = toBody.dot(look);
    if (along <= 0) continue; // behind the camera
    const angle = Math.acos(Math.min(1, along / distance));
    const angularRadius = Math.asin(Math.min(1, body.radius / distance));
    margin = Math.min(margin, angle - angularRadius - halfFov);
  }
  return margin;
}

/**
 * Where to park a follow camera `distance` away from `target` so no planet sits
 * in the frame. Tries the sunlit framing first and returns the first clear
 * candidate; if none is fully clear, the one with the most room.
 */
export function chooseFollowView(
  target: Vector3,
  sun: Vector3,
  distance: number,
  bodies: readonly BackgroundBody[],
  halfFov: number,
  out: Vector3,
): Vector3 {
  const { dir, camera } = scratch;
  let best = -Infinity;
  for (const [turn, lift] of CANDIDATES) {
    dir.subVectors(sun, target).normalize().applyAxisAngle(UP, turn);
    dir.y += lift;
    camera.copy(dir.normalize()).multiplyScalar(distance).add(target);
    const margin = frameMargin(camera, target, bodies, halfFov);
    if (margin > best) {
      best = margin;
      out.copy(camera);
    }
    if (margin >= 0) break;
  }
  return out;
}

/** Half of the diagonal field of view, so a body clear of it is clear of every edge. */
export function halfDiagonalFov(verticalFovDeg: number, aspect: number): number {
  const t = Math.tan((verticalFovDeg * Math.PI) / 360);
  return Math.atan(t * Math.sqrt(1 + aspect * aspect));
}
