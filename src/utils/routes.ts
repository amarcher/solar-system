import type { NavigationState } from '../types/celestialBody';
import { planets } from '../data/planets';
import { getMoonById } from '../data/moons';
import { getMissionById } from '../data/missions';

/**
 * URL ↔ NavigationState mapping.
 *
 * Canonical routes:
 *   /                                → system view
 *   /sun                             → sun detail
 *   /planets/:planetId               → planet detail
 *   /planets/:planetId/moons/:moonId → moon detail
 *   /missions/:missionId             → mission tracker
 *
 * Aliases (marketing-friendly short URLs that normalize to the canonical
 * path on first load via history.replaceState):
 *   /artemis → /missions/artemis-2
 *
 * Unknown or invalid paths (e.g. /planets/nonexistent) fall back to the
 * system view. Vercel's catch-all rewrite in vercel.json serves index.html
 * for any non-/api/ path, so deep links work in production without extra
 * routing config.
 */

const ALIASES: Record<string, NavigationState> = {
  '/artemis': { level: 'mission', missionId: 'artemis-2' },
};

/** Serialize a nav state to its canonical URL pathname. */
export function navToPath(nav: NavigationState): string {
  switch (nav.level) {
    case 'system':
      return '/';
    case 'sun':
      return '/sun';
    case 'planet':
      return `/planets/${nav.planetId}`;
    case 'moon':
      return `/planets/${nav.planetId}/moons/${nav.moonId}`;
    case 'mission':
      return `/missions/${nav.missionId}`;
  }
}

/**
 * Parse a URL pathname into a nav state. Unknown or invalid paths fall
 * back to system view. Validates that referenced planets/moons/missions
 * actually exist in the data files.
 */
export function pathToNav(pathname: string): NavigationState {
  const path = pathname.replace(/\/+$/, '').toLowerCase() || '/';

  // Aliases take precedence over canonical routes
  if (path in ALIASES) return ALIASES[path];

  if (path === '/' || path === '') return { level: 'system' };
  if (path === '/sun') return { level: 'sun' };

  const missionMatch = path.match(/^\/missions\/([^/]+)$/);
  if (missionMatch && getMissionById(missionMatch[1])) {
    return { level: 'mission', missionId: missionMatch[1] };
  }

  const moonMatch = path.match(/^\/planets\/([^/]+)\/moons\/([^/]+)$/);
  if (moonMatch) {
    const [, planetId, moonId] = moonMatch;
    if (planets.some((p) => p.id === planetId) && getMoonById(moonId)) {
      return { level: 'moon', planetId, moonId };
    }
  }

  const planetMatch = path.match(/^\/planets\/([^/]+)$/);
  if (planetMatch && planets.some((p) => p.id === planetMatch[1])) {
    return { level: 'planet', planetId: planetMatch[1] };
  }

  return { level: 'system' };
}

/** Human-readable document title for a nav state. */
export function navToTitle(nav: NavigationState): string {
  const base = 'Space Explorer';
  switch (nav.level) {
    case 'system':
      return `${base} — 3D Solar System for Kids`;
    case 'sun':
      return `The Sun — ${base}`;
    case 'planet': {
      const planet = planets.find((p) => p.id === nav.planetId);
      return planet ? `${planet.name} — ${base}` : base;
    }
    case 'moon': {
      const moon = getMoonById(nav.moonId);
      return moon ? `${moon.name} — ${base}` : base;
    }
    case 'mission': {
      const mission = getMissionById(nav.missionId);
      return mission ? `${mission.name} Live Tracker — ${base}` : base;
    }
  }
}
