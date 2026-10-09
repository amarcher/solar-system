/** Where a body sits in the observer's sky, in degrees. Azimuth: 0=N, 90=E. */
export interface SkyBody {
  id: string;
  name: string;
  altitude: number;
  azimuth: number;
}

export interface SkyLook {
  azimuth: number;
  altitude: number;
}

/** Brightest first: the order the finder lists bodies and the opening view picks from. */
export const SKY_FINDER_ORDER = ['sun', 'moon', 'venus', 'jupiter', 'mars', 'saturn', 'mercury', 'uranus', 'neptune', 'ceres', 'pluto'];

/** The opening view goes to a planet before the Moon: planets are what people come to Sky to find. */
const OPENING_ORDER = ['venus', 'jupiter', 'mars', 'saturn', 'moon', 'mercury'];

/** Below this a body is technically up but lost in the horizon. */
const CLEAR_OF_HORIZON_DEG = 5;

const SKY_COLORS: Record<string, string> = {
  sun: '#ffdd88', moon: '#d8d8d0',
  mercury: '#b0b0b0', venus: '#ffffc0', earth: '#4488ff',
  mars: '#ff6644', jupiter: '#ffcc88', saturn: '#ffddaa',
  uranus: '#88ddff', neptune: '#4466ff', pluto: '#ccbbaa',
  ceres: '#999999',
};

export function skyBodyColor(id: string): string {
  return SKY_COLORS[id] ?? '#ffffff';
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function compassPoint(azimuth: number): string {
  return COMPASS_POINTS[Math.round((((azimuth % 360) + 360) % 360) / 45) % 8];
}

export function sortForFinder<T extends { id: string }>(bodies: T[]): T[] {
  const rank = (id: string) => {
    const index = SKY_FINDER_ORDER.indexOf(id);
    return index === -1 ? SKY_FINDER_ORDER.length : index;
  };
  return [...bodies].sort((a, b) => rank(a.id) - rank(b.id));
}

/**
 * Framing for a body: aim at it, but never so low that the ground fills the
 * view or so high that the horizon (the only sense of direction) is lost.
 */
export function lookAtBody(body: SkyLook): SkyLook {
  return { azimuth: body.azimuth, altitude: Math.min(70, Math.max(20, body.altitude)) };
}

/**
 * Where Sky should face when it opens. Planets hug the ecliptic, so the
 * zenith is usually empty; face the brightest thing that is up, or the
 * side of the sky the ecliptic crosses when nothing is.
 */
export function openingLook(bodies: SkyBody[], latitude: number): SkyLook {
  for (const id of OPENING_ORDER) {
    const body = bodies.find((candidate) => candidate.id === id);
    if (body && body.altitude >= CLEAR_OF_HORIZON_DEG) return lookAtBody(body);
  }
  return { azimuth: latitude >= 0 ? 180 : 0, altitude: 25 };
}

/** Signed smallest rotation from one angle to another, in radians. */
export function shortestTurn(from: number, to: number): number {
  const turn = (to - from) % (2 * Math.PI);
  if (turn > Math.PI) return turn - 2 * Math.PI;
  if (turn < -Math.PI) return turn + 2 * Math.PI;
  return turn;
}
