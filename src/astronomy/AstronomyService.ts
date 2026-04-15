import type { ObserverLocation } from './types';

// Lazy-loaded astronomy-engine module
let astroModule: typeof import('astronomy-engine') | null = null;
let loadPromise: Promise<typeof import('astronomy-engine')> | null = null;

async function loadAstronomy() {
  if (astroModule) return astroModule;
  if (!loadPromise) {
    loadPromise = import('astronomy-engine');
  }
  astroModule = await loadPromise;
  return astroModule;
}

/** Pre-load the module (call on first mode switch). */
export function preload(): Promise<void> {
  return loadAstronomy().then(() => {});
}

/** Returns true if the astronomy engine is loaded and ready. */
export function isReady(): boolean {
  return astroModule !== null;
}

// ── Body ID mapping ──────────────────────────────────────────────────
// Our planet IDs (lowercase) → astronomy-engine Body enum values.
const BODY_MAP: Record<string, string> = {
  mercury: 'Mercury',
  venus: 'Venus',
  earth: 'Earth',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
  moon: 'Moon',
  sun: 'Sun',
};

function resolveBody(id: string) {
  const name = BODY_MAP[id];
  if (!name) throw new Error(`Unknown body: ${id}`);
  return name as import('astronomy-engine').Body;
}

// ── Public API (all synchronous — must call preload() first) ─────────

export interface HelioPosition {
  x: number; // AU, ecliptic
  y: number;
  z: number;
}

export interface GeocentricEquatorial {
  ra: number;   // hours
  dec: number;  // degrees
  dist: number; // AU
}

export interface HorizontalPosition {
  altitude: number; // degrees above horizon
  azimuth: number;  // degrees from north, clockwise
}

/**
 * Heliocentric ecliptic position in AU.
 * Throws if the engine hasn't been loaded yet.
 */
export function getHeliocentricPosition(bodyId: string, time: Date): HelioPosition {
  const A = astroModule!;
  const body = resolveBody(bodyId);
  const vec = A.HelioVector(body, time);
  // astronomy-engine returns equatorial J2000 vectors.
  // Rotate from equatorial to ecliptic for a top-down orrery view.
  // Obliquity of the ecliptic ≈ 23.4393°
  const obliquity = 23.4393 * (Math.PI / 180);
  const cosE = Math.cos(obliquity);
  const sinE = Math.sin(obliquity);
  return {
    x: vec.x,
    y: vec.y * cosE + vec.z * sinE,
    z: -vec.y * sinE + vec.z * cosE,
  };
}

/**
 * Geocentric equatorial coordinates (RA/Dec/distance).
 */
export function getGeocentricPosition(bodyId: string, time: Date): GeocentricEquatorial {
  const A = astroModule!;
  const body = resolveBody(bodyId);
  const observer = new A.Observer(0, 0, 0); // geocenter
  const eq = A.Equator(body, time, observer, true, true);
  return { ra: eq.ra, dec: eq.dec, dist: eq.dist };
}

/**
 * Horizontal (alt/az) coordinates for an observer on Earth.
 */
export function getHorizontalPosition(
  bodyId: string,
  time: Date,
  observer: ObserverLocation,
): HorizontalPosition {
  const A = astroModule!;
  const body = resolveBody(bodyId);
  const obs = new A.Observer(observer.latitude, observer.longitude, observer.elevation);
  const eq = A.Equator(body, time, obs, true, true);
  const hor = A.Horizon(time, obs, eq.ra, eq.dec, 'normal');
  return { altitude: hor.altitude, azimuth: hor.azimuth };
}

/**
 * Moon illumination phase angle (0 = new moon, 180 = full moon).
 */
export function getMoonPhase(time: Date): number {
  const A = astroModule!;
  return A.MoonPhase(time);
}

/**
 * Greenwich Mean Sidereal Time in hours (0–24).
 */
export function getSiderealTime(time: Date): number {
  const A = astroModule!;
  return A.SiderealTime(time);
}
