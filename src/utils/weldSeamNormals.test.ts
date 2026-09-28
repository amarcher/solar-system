import { describe, expect, it } from 'vitest';
import { SphereGeometry } from 'three';
import { weldSeamNormals } from './weldSeamNormals';

describe('weldSeamNormals', () => {
  it('gives duplicated seam vertices of a displaced sphere identical normals', () => {
    const geometry = new SphereGeometry(1, 24, 24);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      position.setX(i, x * (1.4 + 0.3 * position.getY(i)));
    }
    geometry.computeVertexNormals();
    weldSeamNormals(geometry);

    const normal = geometry.attributes.normal;
    // Row 12 (equator): the first and last vertex share the seam position.
    const first = 12 * 25;
    const last = first + 24;
    expect(position.getX(first)).toBeCloseTo(position.getX(last));
    expect(normal.getX(first)).toBeCloseTo(normal.getX(last));
    expect(normal.getZ(first)).toBeCloseTo(normal.getZ(last));
  });
});
