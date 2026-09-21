import { describe, expect, it } from 'vitest';
import { moonVisualRadius, moonFocusDistance } from './moonFraming';

describe('moon close-up framing', () => {
  it('uses the same minimum-sized moon geometry for small moons', () => {
    expect(moonVisualRadius(472)).toBe(0.04);
    expect(moonVisualRadius(5268)).toBeCloseTo(0.21072);
  });
  it.each([[1280, 720], [900, 700], [390, 844], [844, 390]])('fits a legible disk at %i by %i', (width, height) => {
    const radius = moonVisualRadius(472);
    const distance = moonFocusDistance(radius, 50, width, height);
    const projectedDiameter = Math.tan(Math.asin(radius / distance)) / Math.tan(25 * Math.PI / 180) * height;
    expect(projectedDiameter).toBeGreaterThan(140);
    expect(projectedDiameter).toBeLessThanOrEqual(240.00001);
    const panelWidth = width >= 900 ? Math.min(340, width * 0.3) : 0;
    expect(projectedDiameter).toBeLessThan(width - panelWidth * 2);
    expect(distance).toBeGreaterThan(radius * 2);
  });
});
