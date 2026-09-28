import type { ObserverLocation } from './types';
import type { CelestialFrame } from './celestialCoordinates';
import { keplerPosition, type KeplerElements } from './keplerOrbit';

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

// JPL SBDB elements for 1 Ceres, orbit solution 48, epoch 2025-Nov-21.0 TDB.
const CERES_EPOCH_JD = 2461000.5;
const CERES_ECCENTRICITY = 0.07957631994408416;
const CERES_SEMI_MAJOR_AXIS_AU = 2.765615651508659;
const CERES_MEAN_ANOMALY_DEG = 231.5397330043706;
const CERES_MEAN_MOTION_DEG_PER_DAY = 0.2142971214271186;
const CERES_ELEMENTS: KeplerElements = {
  e: CERES_ECCENTRICITY,
  q: CERES_SEMI_MAJOR_AXIS_AU * (1 - CERES_ECCENTRICITY),
  i: 10.58788658206854,
  om: 80.24963090816965,
  w: 73.29975464616518,
  tpJd: CERES_EPOCH_JD - CERES_MEAN_ANOMALY_DEG / CERES_MEAN_MOTION_DEG_PER_DAY,
  meanMotionDegPerDay: CERES_MEAN_MOTION_DEG_PER_DAY,
};

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
  if (bodyId === 'ceres') {
    return keplerPosition(CERES_ELEMENTS, time);
  }

  const A = astroModule!;
  const body = resolveBody(bodyId);
  const vec = A.HelioVector(body, time);
  const ecliptic = A.RotateVector(A.Rotation_EQJ_ECL(), vec);
  return { x: ecliptic.x, y: ecliptic.y, z: ecliptic.z };
}

/** Earth's center → Moon's center, AU in the J2000 ecliptic frame (no surface observer). */
export function getLunarEclipticPosition(time: Date): { x: number; y: number; z: number } {
  const A = astroModule;
  if (!A) throw new Error('Astronomy engine is not ready');
  const ecliptic = A.RotateVector(A.Rotation_EQJ_ECL(), A.GeoMoon(time));
  return { x: ecliptic.x, y: ecliptic.y, z: ecliptic.z };
}

/** Rotation for the entire J2000 sky; HOR includes precession and nutation, not refraction. */
export function getCelestialRotation(frame: CelestialFrame, time: Date, observer: ObserverLocation): number[][] {
  const A = astroModule;
  if (!A) throw new Error('Astronomy engine is not ready');
  return frame === 'ecliptic'
    ? A.Rotation_EQJ_ECL().rot
    : A.Rotation_EQJ_HOR(time, new A.Observer(observer.latitude, observer.longitude, observer.elevation)).rot;
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
 * Greenwich Apparent Sidereal Time in hours (0–24).
 */
export function getSiderealTime(time: Date): number {
  const A = astroModule!;
  return A.SiderealTime(time);
}

/** Apparent equator of date to the J2000 ecliptic used by Orrery positions. */
export function getEarthEquatorialRotation(time: Date): number[][] {
  return astroModule!.Rotation_EQD_ECL(time).rot;
}
