import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { tidesCaptureFraming } from './captureLayout';
import { presentationAt } from './presentation';

describe('portrait lesson framing', () => {
  it('keeps Earth, all scripted Moon positions and the Sun clear of the caption bands', () => {
    const framing = tidesCaptureFraming(9 / 16);
    const camera = new PerspectiveCamera(50, 9 / 16, 0.001, 600);
    camera.position.set(framing.targetX, framing.targetY, framing.distance);
    camera.lookAt(framing.targetX, framing.targetY, 0);
    camera.updateMatrixWorld();
    const assertVisible = (center: [number, number, number], radius: number) => {
      for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 12) {
        const point = new Vector3(center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle), center[2]).project(camera);
        const x = (point.x + 1) * 720 / 2;
        const y = (1 - point.y) * 1280 / 2;
        expect(x).toBeGreaterThan(36);
        expect(x).toBeLessThan(684);
        expect(y).toBeGreaterThan(192);
        expect(y).toBeLessThan(880);
      }
    };
    assertVisible([0, 0, 1.08], 1.65); // Includes the exaggerated ocean and foreground arrows.
    assertVisible([3.05, 0, 0], 0.25);
    for (const elapsed of [0, 3000, 6000, 9000, 12000, 15000]) {
      const phase = presentationAt(elapsed).state.phase * Math.PI / 180;
      assertVisible([Math.cos(phase) * 2.35, Math.sin(phase) * 2.35, 0], 0.22);
    }
  });
});
