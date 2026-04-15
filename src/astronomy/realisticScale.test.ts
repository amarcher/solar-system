import { describe, it, expect } from 'vitest';
import { scaleAU, scaleRealisticRadius } from './realisticScale';

describe('scaleAU', () => {
  it('returns 0 for 0 AU', () => {
    expect(scaleAU(0)).toBe(0);
  });

  it('preserves ordering — farther planets get larger scene values', () => {
    const mercury = scaleAU(0.387);
    const earth = scaleAU(1.0);
    const jupiter = scaleAU(5.2);
    const neptune = scaleAU(30.0);

    expect(mercury).toBeLessThan(earth);
    expect(earth).toBeLessThan(jupiter);
    expect(jupiter).toBeLessThan(neptune);
  });

  it('compresses large distances (Neptune is not 77x Mercury)', () => {
    const mercury = scaleAU(0.387);
    const neptune = scaleAU(30.0);
    const ratio = neptune / mercury;
    // Real ratio is ~77x, compressed should be much less
    expect(ratio).toBeLessThan(10);
    expect(ratio).toBeGreaterThan(1);
  });

  it('handles negative values (sign preserved)', () => {
    expect(scaleAU(-1)).toBeLessThan(0);
    expect(Math.abs(scaleAU(-1))).toBeCloseTo(Math.abs(scaleAU(1)));
  });
});

describe('scaleRealisticRadius', () => {
  it('returns positive values for all planet diameters', () => {
    const diameters = [4879, 12104, 12756, 6792, 142984, 120536, 51118, 49528, 2376];
    for (const d of diameters) {
      expect(scaleRealisticRadius(d)).toBeGreaterThan(0);
    }
  });

  it('larger planets get larger radii', () => {
    const earth = scaleRealisticRadius(12756);
    const jupiter = scaleRealisticRadius(142984);
    expect(jupiter).toBeGreaterThan(earth);
  });

  it('enforces a minimum size', () => {
    const tiny = scaleRealisticRadius(100); // very small body
    expect(tiny).toBeGreaterThanOrEqual(0.08);
  });
});
