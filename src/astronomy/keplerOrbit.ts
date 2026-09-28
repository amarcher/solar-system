/**
 * Two-body heliocentric propagation from osculating orbital elements, for
 * small bodies astronomy-engine does not know (Ceres, curated Rubin finds).
 * Handles closed (e < 1) and hyperbolic (e > 1) orbits. Ignores planetary
 * perturbations, which is fine for a visual orrery over a few years.
 */

const DEG_TO_RAD = Math.PI / 180;
const MS_PER_DAY = 86_400_000;
/** Gaussian gravitational constant, radians per day (Sun's mass only, like JPL's n). */
const GAUSS_K = 0.01720209895;

export interface KeplerElements {
  /** Eccentricity. */
  e: number;
  /** Perihelion distance, AU. */
  q: number;
  /** Inclination to the J2000 ecliptic, degrees. */
  i: number;
  /** Longitude of the ascending node, degrees. */
  om: number;
  /** Argument of perihelion, degrees. */
  w: number;
  /** Time of perihelion passage, Julian date (TDB). */
  tpJd: number;
  /** Override the two-body mean motion (degrees per day) to match a published solution. */
  meanMotionDegPerDay?: number;
}

export interface EclipticVector { x: number; y: number; z: number }

export function toJulianDate(time: Date | number): number {
  const ms = typeof time === 'number' ? time : time.getTime();
  return ms / MS_PER_DAY + 2440587.5;
}

function meanMotion(el: KeplerElements): number {
  if (el.meanMotionDegPerDay !== undefined) return el.meanMotionDegPerDay * DEG_TO_RAD;
  const a = Math.abs(el.q / (1 - el.e));
  return GAUSS_K / Math.sqrt(a * a * a);
}

function solveElliptic(meanAnomaly: number, e: number): number {
  const twoPi = Math.PI * 2;
  const m = ((meanAnomaly % twoPi) + twoPi) % twoPi;
  let E = e < 0.8 ? m : Math.PI;
  for (let k = 0; k < 30; k++) {
    const step = (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
    E -= step;
    if (Math.abs(step) < 1e-12) break;
  }
  return E;
}

function solveHyperbolic(meanAnomaly: number, e: number): number {
  let H = Math.asinh(meanAnomaly / e);
  for (let k = 0; k < 50; k++) {
    const step = (e * Math.sinh(H) - H - meanAnomaly) / (e * Math.cosh(H) - 1);
    H -= step;
    if (Math.abs(step) < 1e-12) break;
  }
  return H;
}

/** In-plane position (x toward perihelion) for an eccentric/hyperbolic anomaly. */
function orbitalPlanePosition(el: KeplerElements, anomaly: number): [number, number] {
  const a = Math.abs(el.q / (1 - el.e));
  if (el.e < 1) {
    return [a * (Math.cos(anomaly) - el.e), a * Math.sqrt(1 - el.e * el.e) * Math.sin(anomaly)];
  }
  return [a * (el.e - Math.cosh(anomaly)), a * Math.sqrt(el.e * el.e - 1) * Math.sinh(anomaly)];
}

function rotateToEcliptic(el: KeplerElements, x: number, y: number): EclipticVector {
  const node = el.om * DEG_TO_RAD;
  const peri = el.w * DEG_TO_RAD;
  const inc = el.i * DEG_TO_RAD;
  const cosO = Math.cos(node), sinO = Math.sin(node);
  const cosW = Math.cos(peri), sinW = Math.sin(peri);
  const cosI = Math.cos(inc), sinI = Math.sin(inc);
  return {
    x: (cosO * cosW - sinO * sinW * cosI) * x + (-cosO * sinW - sinO * cosW * cosI) * y,
    y: (sinO * cosW + cosO * sinW * cosI) * x + (-sinO * sinW + cosO * cosW * cosI) * y,
    z: (sinW * sinI) * x + (cosW * sinI) * y,
  };
}

/** Heliocentric J2000 ecliptic position in AU. */
export function keplerPosition(el: KeplerElements, time: Date | number): EclipticVector {
  const meanAnomaly = meanMotion(el) * (toJulianDate(time) - el.tpJd);
  const anomaly = el.e < 1 ? solveElliptic(meanAnomaly, el.e) : solveHyperbolic(meanAnomaly, el.e);
  const [x, y] = orbitalPlanePosition(el, anomaly);
  return rotateToEcliptic(el, x, y);
}

/**
 * Points along the orbit path, sampled evenly in eccentric anomaly so long,
 * thin ellipses keep a smooth perihelion. Hyperbolic paths are clipped at
 * `maxDistanceAu` and returned in travel order (inbound → outbound).
 */
export function keplerPath(el: KeplerElements, samples: number, maxDistanceAu = 40): EclipticVector[] {
  const points: EclipticVector[] = [];
  if (el.e < 1) {
    for (let k = 0; k < samples; k++) {
      const [x, y] = orbitalPlanePosition(el, (Math.PI * 2 * k) / samples);
      points.push(rotateToEcliptic(el, x, y));
    }
    return points;
  }
  const a = Math.abs(el.q / (1 - el.e));
  const limit = Math.acosh(Math.max(1, (maxDistanceAu / a + 1) / el.e));
  for (let k = 0; k < samples; k++) {
    const [x, y] = orbitalPlanePosition(el, -limit + (2 * limit * k) / (samples - 1));
    points.push(rotateToEcliptic(el, x, y));
  }
  return points;
}
