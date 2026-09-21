import { getPlanetById } from '../data/planets';
import { getLunarEclipticPosition } from './AstronomyService';

/** Local display distance, deliberately independent of the Sun-centered AU compression. */
export const LUNAR_ORRERY_RADIUS = 0.48;
export const LUNAR_PATH_SEGMENTS = 128;
const DAY_MS = 86_400_000;
const SIDEREAL_MONTH_MS = 27.321661 * DAY_MS;

/** Preserve the physical Moon/Earth diameter ratio within the enlarged local display. */
export function lunarOrreryBodyRadius(diameterKm: number): number {
  const earth = getPlanetById('earth');
  if (!earth) throw new Error('Earth display data is missing');
  return earth.visualRadius * diameterKm / earth.diameter;
}

export function lunarOrreryPosition(time: Date): [number, number, number] {
  const position = getLunarEclipticPosition(time);
  const factor = LUNAR_ORRERY_RADIUS / Math.hypot(position.x, position.y, position.z);
  return [position.x * factor, position.z * factor, -position.y * factor];
}

/** The actual directional path is not a fixed flat circle or exactly closed ellipse. */
export function sampleLunarOrreryPath(epochMs: number): Float32Array {
  const positions = new Float32Array((LUNAR_PATH_SEGMENTS + 1) * 3);
  for (let i = 0; i <= LUNAR_PATH_SEGMENTS; i++) {
    const time = new Date(epochMs + (i / LUNAR_PATH_SEGMENTS - 0.5) * SIDEREAL_MONTH_MS);
    positions.set(lunarOrreryPosition(time), i * 3);
  }
  return positions;
}

export interface LunarPathSample { epochMs: number; wallMs: number }

/** Daily date buckets, at most once per real second while fast time playback runs. */
export function nextLunarPathSample(previous: LunarPathSample | null, simMs: number, wallMs: number, paused: boolean): LunarPathSample | null {
  const epochMs = Math.floor(simMs / DAY_MS) * DAY_MS;
  if (previous?.epochMs === epochMs) return null;
  if (previous && !paused && wallMs - previous.wallMs < 1000) return null;
  return { epochMs, wallMs };
}
