/**
 * NASA mission tracker types.
 *
 * Missions are rendered into a "frame" — a coordinate system attached to a
 * celestial body (e.g. Earth-local for Artemis II, Mars-local for Perseverance,
 * sun-local for Voyager). Positions in the ephemeris are expressed in scene
 * units inside that frame.
 */

export type MissionFrame =
  | { kind: 'planet-local'; planetId: string }
  | { kind: 'sun-local' };

export interface MissionEphemerisPoint {
  /** ISO 8601 UTC timestamp */
  t: string;
  /** Position in scene units, relative to the frame's origin */
  x: number;
  y: number;
  z: number;
}

export interface Mission {
  id: string;
  name: string;
  agency: 'NASA';
  /** Mission launch (ISO UTC). Used to interpolate the spacecraft's current position. */
  launchDate: string;
  /** End of nominal mission window (e.g. splashdown). Past this, the trajectory replays. */
  endDate: string;
  /** Kid-friendly one-liner */
  summary: string;
  funFacts: string[];
  /** Trail / accent color (hex) */
  color: string;
  frame: MissionFrame;
  /**
   * Static fallback ephemeris bundled with the app, so the layer renders
   * immediately and survives Horizons outages. Sorted by `t` ascending.
   */
  fallbackEphemeris: MissionEphemerisPoint[];
  /** Vercel serverless route that proxies live JPL Horizons data. */
  ephemerisApiPath: string;
}
