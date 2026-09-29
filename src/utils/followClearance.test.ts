import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { chooseFollowView, halfDiagonalFov, type BackgroundBody } from './followClearance';

const sun = new Vector3(0, 0, 0);
const target = new Vector3(4, 0.1, 1);
const distance = 0.7;
const halfFov = halfDiagonalFov(50, 540 / 960);

// The original fly-in: 1.2 rad off the Sun line, lifted 0.45.
function originalView() {
  const dir = sun.clone().sub(target).normalize().applyAxisAngle(new Vector3(0, 1, 0), 1.2);
  dir.y += 0.45;
  return dir.normalize().multiplyScalar(distance).add(target);
}

function inFrame(camera: Vector3, body: BackgroundBody) {
  const look = target.clone().sub(camera).normalize();
  const toBody = body.position.clone().sub(camera);
  if (toBody.dot(look) <= 0) return false;
  const angle = Math.acos(Math.min(1, toBody.dot(look) / toBody.length()));
  return angle - Math.asin(Math.min(1, body.radius / toBody.length())) < halfFov;
}

describe('Rubin follow camera background clearance', () => {
  it('keeps the original sunlit framing when nothing is behind the target', () => {
    const out = chooseFollowView(target, sun, distance, [], halfFov, new Vector3());
    expect(out.distanceTo(originalView())).toBeLessThan(1e-9);
  });

  it('moves off a planet sitting behind the target and keeps it out of frame', () => {
    const original = originalView();
    // Put a large planet a few units straight behind the target along the original view.
    const behind = target.clone().add(target.clone().sub(original).normalize().multiplyScalar(4));
    const planet = { position: behind, radius: 0.4 };
    expect(inFrame(original, planet)).toBe(true);
    const out = chooseFollowView(target, sun, distance, [planet], halfFov, new Vector3());
    expect(inFrame(out, planet)).toBe(false);
    expect(out.distanceTo(target)).toBeCloseTo(distance, 9);
  });

  it('ignores bodies behind the camera', () => {
    const original = originalView();
    const behindCamera = original.clone().add(original.clone().sub(target).normalize().multiplyScalar(3));
    const out = chooseFollowView(target, sun, distance, [{ position: behindCamera, radius: 0.4 }], halfFov, new Vector3());
    expect(out.distanceTo(original)).toBeLessThan(1e-9);
  });

  it('still returns a view at the follow distance when no candidate is fully clear', () => {
    const everywhere = { position: target.clone(), radius: 50 }; // encloses the whole neighborhood
    const out = chooseFollowView(target, sun, distance, [everywhere], halfFov, new Vector3());
    expect(out.distanceTo(target)).toBeCloseTo(distance, 9);
  });
});
