import type { Mission, MissionEphemerisPoint } from '../../types/mission';

/**
 * Artemis II — NASA's first crewed lunar flyby since Apollo 17.
 *
 * Launched April 1, 2026 at 22:35 UTC from Kennedy Space Center on a ~10-day
 * free-return trajectory around the Moon. This file ships a procedurally
 * generated *fallback* ephemeris matching the published mission profile.
 * The live `/api/missions/artemis2` route serves real JPL Horizons data when
 * available; the app falls back to this when offline or if Horizons is down.
 *
 * Coordinate system: Earth-centered, scene units. The Moon orbits at scene
 * radius 2.0 (matching `moons.ts` for the Moon entry), so 1 scene unit ≈
 * 192,200 km. The trajectory lies in the y=0 plane (Earth-Moon orbital plane
 * approximation, matching how moons render in the app).
 */

const LAUNCH_ISO = '2026-04-01T22:35:00Z';
const SPLASHDOWN_ISO = '2026-04-11T17:00:00Z';
const LAUNCH_MS = Date.parse(LAUNCH_ISO);
const DURATION_MS = Date.parse(SPLASHDOWN_ISO) - LAUNCH_MS;

/**
 * Position on a Kepler ellipse with the focus at the origin.
 *
 * @param perigee     Closest distance to focus (Earth)
 * @param apogee      Farthest distance to focus
 * @param perigeeAngle  Physical angle (radians) where perigee sits
 * @param theta       True anomaly: 0 at perigee, π at apogee, increasing CCW
 */
function ellipsePoint(
  perigee: number,
  apogee: number,
  perigeeAngle: number,
  theta: number,
): [number, number] {
  const a = (perigee + apogee) / 2;
  const e = (apogee - perigee) / (apogee + perigee);
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
  const physicalAngle = perigeeAngle + theta;
  return [r * Math.cos(physicalAngle), r * Math.sin(physicalAngle)];
}

/**
 * Compute the spacecraft's Earth-local scene position at mission progress
 * `t ∈ [0, 1]`, modeled on the real Artemis II free-return trajectory.
 *
 * Coordinate convention is canonical: Earth at origin, Moon direction along
 * +X. The MissionTrajectory component rotates the whole curve at runtime to
 * align with the Moon's actual current direction when the user opens the
 * mission view.
 *
 * Physics-faithful structure (matching the published mission profile):
 *
 *   Phase 1 — High Earth parking orbit. One full revolution of an
 *     elliptical orbit (perigee on the −X side, apogee partway toward
 *     the Moon). In reality: perigee 563 km, apogee 70,000 km, ~23 hours.
 *
 *   Phase 2 — Trans-Lunar Injection burn at perigee. The perigee stays
 *     put; the apogee stretches all the way out past the Moon. The
 *     spacecraft then traces this much larger ellipse — outbound through
 *     the −Z half, "lazy U-turn" at apogee (which sits just past the
 *     Moon), and return through the +Z half. One full revolution of
 *     the post-TLI orbit, ending back at perigee.
 *
 * Both ellipses share the same perigee point, and both have their tangent
 * direction perpendicular to the perigee radius — so the transition from
 * the parking orbit to the post-TLI orbit is smooth (the TLI burn just
 * adds speed along the existing velocity vector, it doesn't change
 * direction). Outbound and return are literally the two halves of one
 * ellipse, traversed continuously.
 */
function trajectoryAt(t: number): [number, number, number] {
  // Phase boundary
  const T_PARK_END = 0.10;   // ~1 day of parking orbit (real mission: 23h of 10d)

  // Geometry — parking orbit (artistically scaled to be visible alongside Earth)
  const PARK_PERIGEE = 0.42;  // just outside Earth's visual radius (~0.32)
  const PARK_APOGEE = 0.85;   // ~40% of the way to the Moon
  const PERIGEE_ANGLE = Math.PI; // perigee at −X so the ellipse extends toward +X (Moon)

  // Geometry — post-TLI free-return ellipse.
  // Apogee is pushed past the Moon's visual radius (~0.139 in scene units)
  // plus a buffer so the spacecraft visibly clears the Moon at U-turn.
  const TLI_PERIGEE = 0.42;   // same perigee as parking orbit (TLI fires here)
  const TLI_APOGEE = 2.30;    // ~0.30 past Moon center → clear of Moon's visual sphere

  let xz: [number, number];

  if (t < T_PARK_END) {
    // Phase 1: parking orbit — one full CCW revolution starting at perigee.
    const u = t / T_PARK_END;
    const theta = u * Math.PI * 2;
    xz = ellipsePoint(PARK_PERIGEE, PARK_APOGEE, PERIGEE_ANGLE, theta);
  } else {
    // Phase 2: post-TLI free-return — one full CCW revolution.
    // Outbound traverses the −Z half (perigee → apogee at the Moon),
    // U-turn at apogee, return traverses the +Z half (apogee → perigee).
    // Mission ends back at perigee (reentry interface).
    const u = (t - T_PARK_END) / (1 - T_PARK_END);
    const theta = u * Math.PI * 2;
    xz = ellipsePoint(TLI_PERIGEE, TLI_APOGEE, PERIGEE_ANGLE, theta);
  }

  // Slight out-of-plane drift so the trajectory has 3D character when
  // the camera orbits around it. Peaks mid-mission (near apogee/Moon).
  const y = Math.sin(t * Math.PI) * 0.05;
  return [xz[0], y, xz[1]];
}

/**
 * Generate ~480 ephemeris points (one every ~30 minutes over 10 days). Dense
 * enough that the rendered trajectory line looks smooth at all camera zoom
 * levels, including the tight curvature near perigee.
 */
function generateFallbackEphemeris(): MissionEphemerisPoint[] {
  const COUNT = 481;
  const out: MissionEphemerisPoint[] = [];
  for (let i = 0; i < COUNT; i++) {
    const u = i / (COUNT - 1);
    const [x, y, z] = trajectoryAt(u);
    const ms = LAUNCH_MS + u * DURATION_MS;
    out.push({
      t: new Date(ms).toISOString(),
      x,
      y,
      z,
    });
  }
  return out;
}

export const artemis2: Mission = {
  id: 'artemis-2',
  name: 'Artemis II',
  agency: 'NASA',
  launchDate: LAUNCH_ISO,
  endDate: SPLASHDOWN_ISO,
  summary:
    "NASA's first crewed mission to the Moon since 1972 — a 10-day flyby that loops around the far side of the Moon and brings four astronauts safely home.",
  funFacts: [
    'Artemis II will travel farther from Earth than any humans have ever gone — about 10,000 km past the far side of the Moon.',
    'The four-person crew includes the first woman and first person of color to journey beyond low Earth orbit.',
    'The mission uses a "free-return" trajectory: if anything goes wrong, the Moon\'s gravity slingshots Orion back home automatically.',
  ],
  color: '#ff8a3d',
  frame: { kind: 'planet-local', planetId: 'earth' },
  fallbackEphemeris: generateFallbackEphemeris(),
  ephemerisApiPath: '/api/missions/artemis2',
};
