import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { createRockGeometry, irregularityForDiameter, seedFromString } from './asteroidRock';

function extents(seed: number) {
  const geometry = createRockGeometry({ seed, composition: 'stony', detail: 3 });
  geometry.computeBoundingBox();
  return geometry.boundingBox!.getSize(new Vector3());
}

describe('createRockGeometry', () => {
  it('is deterministic per seed and different across seeds', () => {
    const a = createRockGeometry({ seed: 42, composition: 'icy', detail: 2 }).getAttribute('position').array;
    const b = createRockGeometry({ seed: 42, composition: 'icy', detail: 2 }).getAttribute('position').array;
    const c = createRockGeometry({ seed: 43, composition: 'icy', detail: 2 }).getAttribute('position').array;
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a)).not.toEqual(Array.from(c));
  });

  it('makes elongated rocks with per-vertex color', () => {
    const geometry = createRockGeometry({ seed: seedFromString('2025-mn45'), composition: 'carbon', detail: 3 });
    expect(geometry.getAttribute('color').count).toBe(geometry.getAttribute('position').count);
    const size = extents(seedFromString('2025-mn45'));
    const [longest, , shortest] = [size.x, size.y, size.z].sort((p, q) => q - p);
    expect(shortest / longest).toBeLessThan(0.9);
  });
});

describe('irregularityForDiameter', () => {
  it('keeps small bodies lumpy and rounds off dwarf-planet-sized ones', () => {
    expect(irregularityForDiameter(0.7)).toBe(1);
    expect(irregularityForDiameter(600)).toBeLessThan(0.2);
  });
});
