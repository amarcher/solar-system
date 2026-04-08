import { useEffect, useState } from 'react';
import type { Mission, MissionEphemerisPoint } from '../types/mission';

interface CachedEphemeris {
  fetchedAt: number;
  ephemeris: MissionEphemerisPoint[];
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const cacheKey = (id: string) => `mission-ephemeris:${id}`;

function readCache(id: string): MissionEphemerisPoint[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(id));
    if (!raw) return null;
    const parsed: CachedEphemeris = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.ephemeris;
  } catch {
    return null;
  }
}

function writeCache(id: string, ephemeris: MissionEphemerisPoint[]) {
  try {
    const payload: CachedEphemeris = { fetchedAt: Date.now(), ephemeris };
    localStorage.setItem(cacheKey(id), JSON.stringify(payload));
  } catch {
    // Quota or private mode — silently ignore.
  }
}

/**
 * Returns the best-available ephemeris for a mission.
 *
 * Resolution order:
 *   1. Fresh localStorage cache (≤ 6h old)
 *   2. Bundled fallback (instantly, until network fetch resolves)
 *   3. Live JPL Horizons via the mission's `ephemerisApiPath` Vercel route
 *
 * Network failures are silent: the bundled fallback stays in place and we
 * console-warn for diagnostics.
 */
export function useMissionEphemeris(mission: Mission): MissionEphemerisPoint[] {
  const [ephemeris, setEphemeris] = useState<MissionEphemerisPoint[]>(() => {
    return readCache(mission.id) ?? mission.fallbackEphemeris;
  });

  useEffect(() => {
    let cancelled = false;
    fetch(mission.ephemerisApiPath)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        // Vercel serverless functions only run under `vercel dev` or in
        // production. Plain `vite dev` serves the raw .ts source file with
        // a non-JSON content type — we should silently fall back to the
        // bundled ephemeris in that case rather than logging a parse error.
        const ct = r.headers.get('content-type') ?? '';
        if (!ct.includes('application/json')) {
          return null;
        }
        return (await r.json()) as { ephemeris: MissionEphemerisPoint[] };
      })
      .then((data) => {
        if (cancelled || !data) return;
        if (Array.isArray(data.ephemeris) && data.ephemeris.length > 0) {
          setEphemeris(data.ephemeris);
          writeCache(mission.id, data.ephemeris);
        }
      })
      .catch((err) => {
        console.warn(`[mission ${mission.id}] live ephemeris unavailable, using fallback:`, err);
      });
    return () => {
      cancelled = true;
    };
  }, [mission.id, mission.ephemerisApiPath]);

  return ephemeris;
}
