import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { Group, Mesh, Object3D } from 'three';

const down = new Vector3();
const center = new Vector3();
const vertex = new Vector3();
const normal = new Vector3();
const view = new Vector3();
const target = new Vector3();

interface LabelBelowOptions {
  /** Irregular tumbling mesh whose vertices are measured each frame. */
  irregularMesh?: React.RefObject<Mesh | null>;
  /** Ring lying in the local XZ plane of `plane`, reaching `radius`. */
  ring?: { plane: React.RefObject<Object3D | null>; radius: number };
}

/**
 * Keeps a label group at the bottom of a body's silhouette as seen by the
 * camera, so an <Html> label hangs just under the body at any zoom or angle.
 * The label group must be a direct child of a group centered on the body.
 */
export function useLabelBelow(radius: number, { irregularMesh, ring }: LabelBelowOptions = {}) {
  const ref = useRef<Group>(null);
  useFrame(({ camera }) => {
    const label = ref.current;
    const parent = label?.parent;
    if (!label || !parent) return;
    parent.getWorldPosition(center);
    down.set(0, -1, 0).applyQuaternion(camera.quaternion);
    let reach = radius;
    const body = irregularMesh?.current;
    if (body) {
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
    const plane = ring?.plane.current;
    if (ring && plane) {
      plane.updateWorldMatrix(true, false);
      normal.set(0, 1, 0).transformDirection(plane.matrixWorld);
      const along = normal.dot(down);
      // An edge-on ring is a near-invisible hairline, so only an open ring pushes the label down.
      const opening = Math.abs(normal.dot(view.copy(center).sub(camera.position).normalize()));
      const visible = Math.min(1, Math.max(0, (opening - 0.05) / 0.2));
      reach = Math.max(reach, visible * ring.radius * Math.sqrt(Math.max(0, 1 - along * along)));
    }
    target.copy(center).addScaledVector(down, reach);
    label.position.copy(parent.worldToLocal(target));
  });
  return ref;
}
