/**
 * Vercel serverless route: live Artemis II ephemeris.
 *
 * Proxies JPL Horizons (https://ssd.jpl.nasa.gov/api/horizons.api) which
 * doesn't allow CORS from browsers. Parses the vector ephemeris response
 * and converts km → scene units (Moon at 384,400 km → scene radius 2.0).
 * Cached at the edge for 6 hours; spacecraft position shifts slowly enough
 * that a 6-hour stale reading is visually indistinguishable from live.
 *
 * Spacecraft lookup is by NAIF ID `-1024` (the canonical SPK ID that JPL
 * has assigned to Artemis II / Orion "Integrity"). Verified against the
 * live Horizons system — returns real ephemeris with the actual TLI burn
 * delta-v, perilune timing, and trajectory correction maneuvers baked in.
 *
 * On any failure (Horizons down, parse error, malformed response) returns
 * HTTP 200 with `{ ephemeris: null, error: '...' }`. The client
 * (`useMissionEphemeris`) treats a null ephemeris as "fall back to the
 * bundled static ephemeris" — same behavior as before, just without the
 * upstream 502 leaking through Cloudflare as a scary error page.
 */

const KM_PER_SCENE_UNIT = 384_400 / 2.0;

// JPL Horizons only has Artemis II ephemeris for the tracked portion
// of the mission, not the full launch-to-splashdown window:
//   - starts ~3h after launch (Apr 2 01:58:32 UTC) once the spacecraft
//     was being tracked by DSN
//   - ends ~17h before splashdown (Apr 10 23:54:30 UTC) at EI — Orion
//     stops being tracked by ephemeris once it's on atmospheric entry
// Querying outside this window returns a "No ephemeris for..." error
// from Horizons. Use a window that's safely inside. The pre-TLI parking
// orbit phase and the final re-entry phase still come from the bundled
// fallback ephemeris for those short pre/post windows.
const HORIZONS_START_ISO = '2026-04-02T02:00:00Z';
const HORIZONS_STOP_ISO = '2026-04-10T23:00:00Z';

/** JPL NAIF/SPK ID for Artemis II (Orion "Integrity"). */
const ARTEMIS_II_NAIF_ID = '-1024';

interface EphemerisPoint {
  t: string;
  x: number;
  y: number;
  z: number;
}

/**
 * Parse the SOE/EOE-delimited vector block of a Horizons text response.
 * Each record looks like:
 *   2461138.500000000 = A.D. 2026-Apr-08 00:00:00.0000 TDB
 *    X =-1.143055314414975E+05 Y =-3.482197817499958E+05 Z =-3.798797662550198E+04
 */
function parseHorizonsVectors(text: string): EphemerisPoint[] {
  const points: EphemerisPoint[] = [];
  const soe = text.indexOf('$$SOE');
  const eoe = text.indexOf('$$EOE');
  if (soe === -1 || eoe === -1) return points;
  const block = text.slice(soe + 5, eoe);
  const records = block.split(/\n(?=\d{7}\.\d+\s*=)/);
  for (const rec of records) {
    const dateMatch = rec.match(/A\.D\.\s+(\d{4})-([A-Za-z]{3})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (!dateMatch) continue;
    const [, year, monStr, day, hh, mm, ss] = dateMatch;
    const months: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    };
    const isoT = `${year}-${months[monStr]}-${day}T${hh}:${mm}:${ss}Z`;

    const xyzMatch = rec.match(/X\s*=\s*(-?[\d.E+-]+)\s+Y\s*=\s*(-?[\d.E+-]+)\s+Z\s*=\s*(-?[\d.E+-]+)/);
    if (!xyzMatch) continue;
    const xKm = parseFloat(xyzMatch[1]);
    const yKm = parseFloat(xyzMatch[2]);
    const zKm = parseFloat(xyzMatch[3]);
    if (!isFinite(xKm) || !isFinite(yKm) || !isFinite(zKm)) continue;

    points.push({
      t: isoT,
      // Horizons vectors are Earth-centered J2000 ecliptic (X, Y, Z in km).
      // Our scene has Y as "up" and the orbital plane in XZ, so we map
      // Horizons (X, Y, Z) → scene (X, Z, -Y). The Moon orbits at scene
      // radius 2.0 ≈ 384,400 km, so divide by KM_PER_SCENE_UNIT.
      x: xKm / KM_PER_SCENE_UNIT,
      y: zKm / KM_PER_SCENE_UNIT,
      z: -yKm / KM_PER_SCENE_UNIT,
    });
  }
  return points;
}

/** Graceful error response — HTTP 200 with null ephemeris. Client will use bundled fallback. */
function fallback(res: any, error: string, extra?: Record<string, unknown>) {
  res.status(200).json({ missionId: 'artemis-2', ephemeris: null, error, ...extra });
}

export default async function handler(_req: unknown, res: any) {
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
  res.setHeader('Content-Type', 'application/json');

  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${ARTEMIS_II_NAIF_ID}'`,
    CENTER: "'500@399'", // Earth geocenter
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    START_TIME: `'${HORIZONS_START_ISO.replace('T', ' ').replace('Z', '')}'`,
    STOP_TIME: `'${HORIZONS_STOP_ISO.replace('T', ' ').replace('Z', '')}'`,
    STEP_SIZE: "'2 h'",
    OUT_UNITS: 'KM-S',
    REF_PLANE: 'ECLIPTIC',
    REF_SYSTEM: 'J2000',
    VEC_TABLE: '1',
    CSV_FORMAT: 'NO',
  });

  try {
    const upstream = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!upstream.ok) {
      return fallback(res, 'horizons_http_error', { status: upstream.status });
    }
    const body = await upstream.json() as { result?: string; error?: string };
    if (body?.error) {
      return fallback(res, 'horizons_api_error', { message: body.error });
    }
    const text = body?.result ?? '';
    const ephemeris = parseHorizonsVectors(text);
    if (ephemeris.length === 0) {
      return fallback(res, 'horizons_no_data');
    }
    res.status(200).json({ missionId: 'artemis-2', ephemeris });
  } catch (err) {
    return fallback(res, 'horizons_fetch_failed', { message: String(err) });
  }
}
