import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { Group, Mesh } from 'three';

const down = new Vector3();
const center = new Vector3();
const vertex = new Vector3();
const target = new Vector3();

/**
 * Keeps a label group at the bottom of a body's silhouette as seen by the
 * camera, so an <Html> label hangs just under the body at any zoom or angle.
 * Spheres use `radius`; a tumbling irregular `mesh` is measured each frame.
 */
export function useLabelBelow(radius: number, mesh?: React.RefObject<Mesh | null>, irregular = false) {
  const ref = useRef<Group>(null);
  useFrame(({ camera }) => {
    const label = ref.current;
    const parent = label?.parent;
    if (!label || !parent) return;
    parent.getWorldPosition(center);
    down.set(0, -1, 0).applyQuaternion(camera.quaternion);
    let reach = radius;
    const body = mesh?.current;
    if (irregular && body) {
      // The moon moved earlier this frame; refresh before render would.
      body.updateWorldMatrix(false, false);
      const position = body.geometry.attributes.position;
      reach = 0;
      for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i).applyMatrix4(body.matrixWorld).sub(center);
        reach = Math.max(reach, vertex.dot(down));
      }
    }
    const distance = camera.position.distanceTo(center);
    // Perspective: the silhouette edge sits at tan(asin(r / d)) * d, slightly beyond r.
    if (distance > reach * 1.01) reach *= distance / Math.sqrt(distance * distance - reach * reach);
    target.copy(center).addScaledVector(down, reach);
    label.position.copy(parent.worldToLocal(target));
  });
  return ref;
}
