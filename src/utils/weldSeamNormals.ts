import type { BufferGeometry } from 'three';

/**
 * SphereGeometry duplicates vertices along the UV seam and at the poles, so
 * computeVertexNormals() lights each side differently once the surface is
 * displaced. Average normals across vertices that share a position.
 */
export function weldSeamNormals(geometry: BufferGeometry): void {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const groups = new Map<string, number[]>();
  for (let i = 0; i < position.count; i++) {
    // Math.round turns tiny negatives into -0, which stringifies as "0".
    const key = `${Math.round(position.getX(i) * 1e5)},${Math.round(position.getY(i) * 1e5)},${Math.round(position.getZ(i) * 1e5)}`;
    const group = groups.get(key);
    if (group) group.push(i);
    else groups.set(key, [i]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    let x = 0, y = 0, z = 0;
    for (const i of group) {
      x += normal.getX(i); y += normal.getY(i); z += normal.getZ(i);
    }
    const length = Math.hypot(x, y, z) || 1;
    for (const i of group) normal.setXYZ(i, x / length, y / length, z / length);
  }
  normal.needsUpdate = true;
}
