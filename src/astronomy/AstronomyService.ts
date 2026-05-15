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

const DEG_TO_RAD = Math.PI / 180;
const MS_PER_DAY = 86_400_000;

// JPL SBDB elements for 1 Ceres, orbit solution 48, epoch 2025-Nov-21.0 TDB.
const CERES_ELEMENTS = {
  epochJd: 2461000.5,
  eccentricity: 0.07957631994408416,
  semiMajorAxisAu: 2.765615651508659,
  inclinationDeg: 10.58788658206854,
  longitudeAscendingNodeDeg: 80.24963090816965,
  argumentPerihelionDeg: 73.29975464616518,
  meanAnomalyDeg: 231.5397330043706,
  meanMotionDegPerDay: 0.2142971214271186,
};

function toJulianDate(time: Date): number {
  return time.getTime() / MS_PER_DAY + 2440587.5;
}

function normalizeRadians(angle: number): number {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function solveEccentricAnomaly(meanAnomaly: number, eccentricity: number): number {
  let eccentricAnomaly = eccentricity < 0.8 ? meanAnomaly : Math.PI;
  for (let i = 0; i < 8; i++) {
    eccentricAnomaly -= (
      eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly
    ) / (1 - eccentricity * Math.cos(eccentricAnomaly));
  }
  return eccentricAnomaly;
}

function getCeresHeliocentricPosition(time: Date): HelioPosition {
  const daysSinceEpoch = toJulianDate(time) - CERES_ELEMENTS.epochJd;
  const meanAnomaly = normalizeRadians((
    CERES_ELEMENTS.meanAnomalyDeg + CERES_ELEMENTS.meanMotionDegPerDay * daysSinceEpoch
  ) * DEG_TO_RAD);
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, CERES_ELEMENTS.eccentricity);
  const cosE = Math.cos(eccentricAnomaly);
  const sinE = Math.sin(eccentricAnomaly);
  const xOrbital = CERES_ELEMENTS.semiMajorAxisAu * (cosE - CERES_ELEMENTS.eccentricity);
  const yOrbital = CERES_ELEMENTS.semiMajorAxisAu
    * Math.sqrt(1 - CERES_ELEMENTS.eccentricity ** 2)
    * sinE;

  const node = CERES_ELEMENTS.longitudeAscendingNodeDeg * DEG_TO_RAD;
  const perihelion = CERES_ELEMENTS.argumentPerihelionDeg * DEG_TO_RAD;
  const inclination = CERES_ELEMENTS.inclinationDeg * DEG_TO_RAD;
  const cosNode = Math.cos(node);
  const sinNode = Math.sin(node);
  const cosPerihelion = Math.cos(perihelion);
  const sinPerihelion = Math.sin(perihelion);
  const cosInclination = Math.cos(inclination);
  const sinInclination = Math.sin(inclination);

  return {
    x: (cosNode * cosPerihelion - sinNode * sinPerihelion * cosInclination) * xOrbital
      + (-cosNode * sinPerihelion - sinNode * cosPerihelion * cosInclination) * yOrbital,
    y: (sinNode * cosPerihelion + cosNode * sinPerihelion * cosInclination) * xOrbital
      + (-sinNode * sinPerihelion + cosNode * cosPerihelion * cosInclination) * yOrbital,
    z: (sinPerihelion * sinInclination) * xOrbital
      + (cosPerihelion * sinInclination) * yOrbital,
  };
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
  if (bodyId === 'ceres') {
    return getCeresHeliocentricPosition(time);
  }

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
