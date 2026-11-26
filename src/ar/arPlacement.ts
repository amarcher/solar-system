import { Vector3 } from 'three';

/**
 * Room placement for the AR solar system.
 *
 * The scene keeps its normal units (Sun at the origin, Neptune ~37 units out).
 * Instead of shrinking the scene, the viewer's origin is scaled up, which
 * leaves every world-space shader and position store untouched. Flying to a
 * planet is the same trick in motion: the origin shrinks and slides until the
 * planet is large and right in front of the viewer.
 */

/** Scene units per real metre in the room view: 40 puts Pluto's orbit one metre from the Sun. */
export const UNITS_PER_METER = 40;

export interface Placement {
  /** Horizontal distance from the viewer's head, in metres. */
  distance: number;
  /** How far below eye level, in metres. */
  drop: number;
}

/** In the headset: the Sun floats at chest height, a step and a half away. */
export const ROOM_PLACEMENT: Placement = { distance: 1.4, drop: 0.45 };
/** On a flat screen: far enough back to see the whole system. */
export const PREVIEW_PLACEMENT: Placement = { distance: 1.5, drop: 0.55 };
/** After flying to a body in the headset: just below eye level, out of arm's reach. */
export const FOCUS_PLACEMENT: Placement = { distance: 1.6, drop: 0.15 };
/** On a flat screen the camera looks down, so the body sits lower to stay centred. */
export const PREVIEW_FOCUS_PLACEMENT: Placement = { distance: 1.5, drop: 0.55 };

/** How big a body looks after flying to it: 70 cm across, whatever its size in the scene. */
export const FOCUS_RADIUS_METERS = 0.35;

/** Scene units per metre that make a body of the given scene radius look that big. */
export const focusScale = (radius: number) => radius / FOCUS_RADIUS_METERS;

const flat = new Vector3();

/**
 * The point in the room, in metres, that sits in front of the viewer.
 * `head` and `forward` are in the origin's own space.
 */
export function anchorInFront(head: Vector3, forward: Vector3, placement: Placement, target = new Vector3()): Vector3 {
  flat.set(forward.x, 0, forward.z);
  // Looking straight up or down gives no heading; fall back to the default view direction.
  if (flat.lengthSq() < 1e-6) flat.set(0, 0, -1);
  flat.normalize();
  return target.copy(head).addScaledVector(flat, placement.distance).setY(head.y - placement.drop);
}

/** A way of looking at the scene: `focus` (scene units) is shown at `anchor` (room metres). */
export interface View {
  /** Scene units per real metre. */
  scale: number;
  focus: Vector3;
  anchor: Vector3;
}

export const createView = (): View => ({ scale: UNITS_PER_METER, focus: new Vector3(), anchor: new Vector3() });

/**
 * The view part-way through a flight. Scale changes by equal ratios over time,
 * and the focus moves in step with it, so the destination glides steadily
 * towards its resting place instead of swinging out wide.
 */
export function blendViews(from: View, to: View, progress: number, out: View): View {
  out.scale = Math.exp(Math.log(from.scale) + (Math.log(to.scale) - Math.log(from.scale)) * progress);
  const zoom = to.scale - from.scale;
  const weight = Math.abs(zoom) < from.scale * 1e-3 ? progress : (out.scale - from.scale) / zoom;
  out.focus.lerpVectors(from.focus, to.focus, weight);
  out.anchor.lerpVectors(from.anchor, to.anchor, progress);
  return out;
}

/** Where the viewer's origin must sit to give this view. */
export function originForView(view: View, target = new Vector3()): Vector3 {
  return target.copy(view.focus).addScaledVector(view.anchor, -view.scale);
}

/** Where a point of the scene appears in the room, in metres, under this view. */
export function roomPosition(view: View, scenePoint: Vector3, target = new Vector3()): Vector3 {
  return target.copy(scenePoint).sub(view.focus).divideScalar(view.scale).add(view.anchor);
}
