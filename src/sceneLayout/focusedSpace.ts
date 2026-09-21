import { Vector3 } from 'three';
import type { Moon, Planet, NavigationState } from '../types/celestialBody';
import type { ViewMode } from '../astronomy/types';
import { orreryMoonOrbitRadius } from '../astronomy/moonSpacing';
import { moonVisualRadius } from '../utils/moonFraming';
import { planetDisplayExtent } from '../utils/planetExtent';

export const MAX_FOCUS_EXPANSION = 32;
export interface OrbitReference { points: Float32Array; minRadius: number; maxRadius: number }
export function orbitReference(points: Float32Array): OrbitReference {
  let minRadius = Infinity, maxRadius = 0;
  for (let i = 0; i < points.length; i += 3) {
    const radius = Math.hypot(points[i], points[i + 1], points[i + 2]);
    minRadius = Math.min(minRadius, radius); maxRadius = Math.max(maxRadius, radius);
  }
  return { points, minRadius, maxRadius };
}
export function focusedParent(nav: NavigationState, mode: ViewMode, missionActive: boolean): string | null {
  return mode !== 'sky' && !missionActive && (nav.level === 'planet' || nav.level === 'moon') ? nav.planetId : null;
}
export function localSystemExtent(planet: Planet, moons: readonly Moon[], mode: ViewMode): number {
  // Include clouds and the largest exaggerated tidal shell, without changing either.
  let extent = Math.max(planetDisplayExtent(planet), planet.visualRadius * 1.8);
  for (const moon of moons) {
    const radius = moonVisualRadius(moon.diameter, moon.id, mode) * (moon.shape === 'irregular' ? 2.6 : 1);
    const orbit = mode === 'orrery' ? orreryMoonOrbitRadius(moon) : moon.orbitRadius;
    extent = Math.max(extent, orbit + radius);
  }
  return extent;
}
/** Closed rendered polylines, including their segments, not merely sample points. */
export function distanceToOrbit(point: Vector3, points: Float32Array): number {
  let closestSq = Infinity;
  for (let i = 0; i < points.length; i += 3) {
    const j = (i + 3) % points.length;
    const x = points[j] - points[i], y = points[j + 1] - points[i + 1], z = points[j + 2] - points[i + 2];
    const px = point.x - points[i], py = point.y - points[i + 1], pz = point.z - points[i + 2];
    const lengthSq = x * x + y * y + z * z;
    const t = lengthSq ? Math.max(0, Math.min(1, (px * x + py * y + pz * z) / lengthSq)) : 0;
    closestSq = Math.min(closestSq, (px - t * x) ** 2 + (py - t * y) ** 2 + (pz - t * z) ** 2);
  }
  return Math.sqrt(closestSq);
}
/** Radial bounds are a conservative gap across time for non-overlapping orbits.
 * Inclined/eccentric overlapping bands fall back to the actually drawn segments. */
export function requiredExpansion(focusId: string, extent: number, planets: readonly Planet[], raw: ReadonlyMap<string, Vector3>, paths: ReadonlyMap<string, OrbitReference>): number {
  const center = raw.get(focusId);
  if (!center) return 1;
  const focusedPath = paths.get(focusId);
  let expansion = (extent * 1.25 + 2) / Math.max(0.05, focusedPath?.minRadius ?? center.length());
  for (const planet of planets) {
    if (planet.id === focusId) continue;
    const neighbor = raw.get(planet.id), path = paths.get(planet.id);
    let gap = neighbor ? center.distanceTo(neighbor) : Infinity;
    if (path) {
      gap = Math.min(gap, distanceToOrbit(center, path.points));
      if (focusedPath) {
        const radialGap = Math.max(path.minRadius - focusedPath.maxRadius, focusedPath.minRadius - path.maxRadius);
        if (radialGap > 0) gap = Math.min(gap, radialGap);
      }
    }
    expansion = Math.max(expansion, (extent * 1.25 + planetDisplayExtent(planet) + 0.1) / Math.max(gap, 0.05));
  }
  // A genuine curve intersection cannot be separated by uniform scaling.
  // Orbit rendering also fades the local clearance zone, avoiding singular zoom.
  return Math.min(MAX_FOCUS_EXPANSION, Math.max(1, expansion));
}
export interface FocusSpace {
  scale: number; offset: Vector3; previousScale: number; previousOffset: Vector3;
  focusId: string | null; focusRaw: Vector3; focusPosition: Vector3; clearance: number;
  raw: Map<string, Vector3>; paths: Map<string, OrbitReference>;
}
export function createFocusSpace(): FocusSpace {
  return { scale: 1, offset: new Vector3(), previousScale: 1, previousOffset: new Vector3(), focusId: null,
    focusRaw: new Vector3(), focusPosition: new Vector3(), clearance: 0, raw: new Map(), paths: new Map() };
}
export function applyFocusSpace(space: Pick<FocusSpace, 'scale' | 'offset'>, source: Vector3, target: Vector3): Vector3 {
  return target.copy(source).multiplyScalar(space.scale).add(space.offset);
}
export function focusLayoutShift(space: FocusSpace, raw: Vector3, target: Vector3): Vector3 {
  return target.copy(raw).multiplyScalar(space.scale - space.previousScale).add(space.offset).sub(space.previousOffset);
}
export function advanceFocusSpace(space: FocusSpace, focusId: string | null, targetScale: number, extent: number, delta: number, immediate: boolean): void {
  const center = focusId ? space.raw.get(focusId) : undefined;
  // Carry a moving anchor without treating its physical motion as a new layout.
  if (center && focusId === space.focusId) {
    space.offset.addScaledVector(center, 1 - space.scale).addScaledVector(space.focusRaw, space.scale - 1);
  }
  space.previousScale = space.scale;
  space.previousOffset.copy(space.offset);
  const alpha = immediate ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * 6);
  const goal = center ? targetScale : 1;
  space.scale += (goal - space.scale) * alpha;
  const multiplier = center ? 1 - goal : 0;
  space.offset.x += ((center?.x ?? 0) * multiplier - space.offset.x) * alpha;
  space.offset.y += ((center?.y ?? 0) * multiplier - space.offset.y) * alpha;
  space.offset.z += ((center?.z ?? 0) * multiplier - space.offset.z) * alpha;
  space.clearance += ((center ? extent * 1.08 : 0) - space.clearance) * alpha;
  if (!center && Math.abs(space.scale - 1) < 1e-5 && space.offset.lengthSq() < 1e-8) {
    space.scale = 1; space.offset.set(0, 0, 0); space.clearance = 0;
  }
  if (center) { space.focusId = focusId; space.focusRaw.copy(center); }
  const fadeCenter = space.focusId ? space.raw.get(space.focusId) : null;
  if (fadeCenter) applyFocusSpace(space, fadeCenter, space.focusPosition);
}
