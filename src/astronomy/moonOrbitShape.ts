import { Vector3 } from 'three';
import { getPlanetById } from '../data/planets';
import type { Moon } from '../types/celestialBody';
import { solveElliptic } from './keplerOrbit';

const DEG_TO_RAD = Math.PI / 180;
const TWO_PI = Math.PI * 2;

/** Scene distance added per doubling of real distance, in parent visual radii. */
export const MOON_LOG_SPREAD = 0.6;
/** Scene spin for moons whose rotation has not been pinned down. */
export const UNMEASURED_SPIN_HOURS = 10;
export const MOON_PATH_SEGMENTS = 128;

export interface MoonOrbitShape {
  eccentricity: number;
  /** Radians between the orbit and the scene's flat moon plane. */
  tilt: number;
  node: number;
  periapsis: number;
  /** Scene units per doubling of distance along the orbit. */
  logScale: number;
}

function unitHash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return (h >>> 0) / 4294967296;
}

/**
 * Tilted, stretched path for a captured moon; null keeps the flat circle.
 * The Sun swings these orbits' nodes and periapses around within a human
 * lifetime, so each moon gets a stable illustrative direction, not an epoch.
 */
export function moonOrbitShape(moon: Moon): MoonOrbitShape | null {
  if (!moon.orbitEccentricity && !moon.orbitInclination) return null;
  const planet = getPlanetById(moon.parentPlanetId);
  if (!planet) throw new Error(`Missing parent planet: ${moon.parentPlanetId}`);
  const inclination = moon.orbitInclination ?? 0;
  return {
    eccentricity: moon.orbitEccentricity ?? 0,
    // `retrograde` already reverses the motion, so fold the plane back under 90°.
    tilt: (moon.retrograde ? 180 - inclination : inclination) * DEG_TO_RAD,
    node: unitHash(`${moon.id}:node`) * TWO_PI,
    periapsis: unitHash(`${moon.id}:periapsis`) * TWO_PI,
    logScale: planet.visualRadius * MOON_LOG_SPREAD,
  };
}

function place(shape: MoonOrbitShape, radius: number, eccentricAnomaly: number, target: Vector3): Vector3 {
  const e = shape.eccentricity;
  const cosE = Math.cos(eccentricAnomaly), sinE = Math.sin(eccentricAnomaly);
  // Real distance over semi-major axis, compressed like the spacing between moons
  // so a stretched orbit never appears to cross an inner moon it really clears.
  const distance = radius + shape.logScale * Math.log2(1 - e * cosE);
  const angle = shape.periapsis + Math.atan2(Math.sqrt(1 - e * e) * sinE, cosE - e);
  const x = distance * Math.cos(angle);
  const inPlane = distance * Math.sin(angle);
  const z = inPlane * Math.cos(shape.tilt);
  const cosNode = Math.cos(shape.node), sinNode = Math.sin(shape.node);
  return target.set(x * cosNode - z * sinNode, inPlane * Math.sin(shape.tilt), x * sinNode + z * cosNode);
}

/** Position for a signed mean anomaly; `radius` is the displayed semi-major axis. */
export function moonOrbitPoint(shape: MoonOrbitShape, radius: number, meanAnomaly: number, target: Vector3): Vector3 {
  return place(shape, radius, solveElliptic(meanAnomaly, shape.eccentricity), target);
}

export function moonOrbitPath(shape: MoonOrbitShape, radius: number): Float32Array {
  const points = new Float32Array(MOON_PATH_SEGMENTS * 3);
  const point = new Vector3();
  for (let i = 0; i < MOON_PATH_SEGMENTS; i++) place(shape, radius, (i / MOON_PATH_SEGMENTS) * TWO_PI, point).toArray(points, i * 3);
  return points;
}

/** How far the displayed apoapsis reaches beyond the displayed semi-major axis. */
export function moonOrbitReach(moon: Moon): number {
  const shape = moonOrbitShape(moon);
  return shape ? shape.logScale * Math.log2(1 + shape.eccentricity) : 0;
}

/** Hours per spin used by the scene. */
export function moonSpinHours(moon: Moon): number {
  return moon.rotationPeriod ?? (moon.rotationUnknown ? UNMEASURED_SPIN_HOURS : moon.orbitalPeriod * 24);
}
