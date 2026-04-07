/**
 * Vercel serverless route: live Artemis II ephemeris.
 *
 * Proxies JPL Horizons (https://ssd-api.jpl.nasa.gov/horizons.api) which
 * doesn't allow CORS from browsers. Parses the vector ephemeris response and
 * converts km → scene units (Moon at 384,400 km → scene radius 2.0). Cached
 * at the edge for 6 hours since the trajectory only changes when NASA
 * publishes a new solution.
 *
 * On any failure (Horizons down, body not yet tracked, parse error) returns
 * 502 so the frontend gracefully falls back to the bundled static ephemeris.
 *
 * Note: as of writing, the canonical Horizons SPK ID for Artemis II may not
 * yet be assigned. The COMMAND value below is a best-effort lookup string;
 * adjust to a numeric SPK ID once NASA publishes one.
 */

const KM_PER_SCENE_UNIT = 384_400 / 2.0;

const LAUNCH_ISO = '2026-04-01T22:35:00Z';
const SPLASHDOWN_ISO = '2026-04-11T17:00:00Z';

interface EphemerisPoint {
  t: string;
  x: number;
  y: number;
  z: number;
}

/**
 * Parse the SOE/EOE-delimited vector block of a Horizons text response.
 * Each record looks like:
 *   2459580.500000000 = A.D. 2026-Apr-01 00:00:00.0000 TDB
 *    X = ... Y = ... Z = ...
 *    VX= ... VY= ... VZ= ...
 *    LT= ... RG= ... RR= ...
 */
function parseHorizonsVectors(text: string): EphemerisPoint[] {
  const points: EphemerisPoint[] = [];
  const soe = text.indexOf('$$SOE');
  const eoe = text.indexOf('$$EOE');
  if (soe === -1 || eoe === -1) return points;
  const block = text.slice(soe + 5, eoe);
  // Split into records on the JD-prefixed date line
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
      // Horizons uses ecliptic-of-date (X,Y,Z); our scene uses (X, Y up, Z).
      // Map Horizons (X,Y,Z) → scene (X, Z, -Y) so the orbital plane lies
      // in the scene's XZ plane (matching how moons render).
      x: xKm / KM_PER_SCENE_UNIT,
      y: zKm / KM_PER_SCENE_UNIT,
      z: -yKm / KM_PER_SCENE_UNIT,
    });
  }
  return points;
}

export default async function handler(_req: unknown, res: any) {
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
  res.setHeader('Content-Type', 'application/json');

  // Build Horizons query.
  // CENTER='@399' = Earth (geocenter). COMMAND= the spacecraft lookup.
  // Many crewed/recent NASA missions are addressable by their name once
  // Horizons ingests them; for missions Horizons doesn't yet track, this
  // call will return an error body and we surface 502 → frontend fallback.
  const params = new URLSearchParams({
    format: 'text',
    COMMAND: "'ARTEMIS II'",
    CENTER: "'500@399'",
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    START_TIME: `'${LAUNCH_ISO.replace('T', ' ').replace('Z', '')}'`,
    STOP_TIME: `'${SPLASHDOWN_ISO.replace('T', ' ').replace('Z', '')}'`,
    STEP_SIZE: "'2 h'",
    OUT_UNITS: 'KM-S',
    REF_PLANE: 'ECLIPTIC',
    REF_SYSTEM: 'J2000',
    VEC_TABLE: '1',
    CSV_FORMAT: 'NO',
  });

  try {
    const upstream = await fetch(`https://ssd-api.jpl.nasa.gov/horizons.api?${params.toString()}`, {
      headers: { Accept: 'text/plain' },
    });
    if (!upstream.ok) {
      res.status(502).json({ error: 'horizons_unavailable', status: upstream.status });
      return;
    }
    const body = await upstream.json() as { result?: string };
    const text = body?.result ?? '';
    const ephemeris = parseHorizonsVectors(text);
    if (ephemeris.length === 0) {
      res.status(502).json({ error: 'horizons_no_data' });
      return;
    }
    res.status(200).json({ missionId: 'artemis-2', ephemeris });
  } catch (err) {
    res.status(502).json({ error: 'horizons_fetch_failed', message: String(err) });
  }
}
