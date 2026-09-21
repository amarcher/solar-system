import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { tidesCaptureFraming } from './captureLayout';
import { getPlanetById } from '../data/planets';
import { getMoonById } from '../data/moons';
import { LUNAR_ORRERY_RADIUS } from '../astronomy/lunarOrrery';
import { moonVisualRadius } from '../utils/moonFraming';

describe('actual Earth and Moon portrait framing', () => {
  it.each([['artistic', 2], ['orrery', LUNAR_ORRERY_RADIUS]] as const)('fits %s live positions without relocating either body', (mode, orbitDistance) => {
    const earthRadius = getPlanetById('earth')!.visualRadius;
    const moonRadius = moonVisualRadius(getMoonById('moon')!.diameter, 'moon', mode);
    const earth = new Vector3(5, 1, -3), original = earth.clone();
    const direction = new Vector3(1, 1, 2).normalize();
    const right = new Vector3().crossVectors(new Vector3(0, 1, 0), direction).normalize();
    const up = new Vector3().crossVectors(direction, right).normalize();
    for (const moonDirection of [right, up, direction, direction.clone().negate(), new Vector3(1, 2, -3).normalize()]) {
      const moon = earth.clone().addScaledVector(moonDirection, orbitDistance), originalMoon = moon.clone();
      const framing = tidesCaptureFraming(earth, moon, direction, up, earthRadius, moonRadius);
      const camera = new PerspectiveCamera(50, 9 / 16, 0.001, 600);
      camera.position.copy(framing.position); camera.lookAt(framing.target); camera.updateMatrixWorld();
      expect(earth.equals(original)).toBe(true);
      expect(moon.equals(originalMoon)).toBe(true);
      expect(camera.position.clone().sub(framing.target).normalize().distanceTo(direction)).toBeLessThan(1e-12);
      if (orbitDistance === 2 && moonDirection === right) expect(camera.position.distanceTo(framing.target)).toBeGreaterThan(earthRadius * 5 + 2);
      for (const [center, radius] of [[earth, earthRadius * 1.8], [moon, moonRadius]] as const) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
          for (let b = 0; b <= Math.PI; b += Math.PI / 6) {
            const point = center.clone().add(new Vector3(Math.cos(a) * Math.sin(b), Math.sin(a) * Math.sin(b), Math.cos(b)).multiplyScalar(radius)).project(camera);
            expect((point.x + 1) * 360).toBeGreaterThanOrEqual(36);
            expect((point.x + 1) * 360).toBeLessThanOrEqual(684);
            expect((1 - point.y) * 640).toBeGreaterThan(192);
            expect((1 - point.y) * 640).toBeLessThan(880);
          }
        }
      }
    }
  });
});
