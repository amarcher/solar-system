import type { Mission, MissionEphemerisPoint } from '../../types/mission';

/**
 * Artemis II — NASA's first crewed lunar flyby since Apollo 17.
 *
 * Launched April 1, 2026 at 22:35 UTC from Kennedy Space Center on a ~10-day
 * free-return trajectory around the Moon. This file generates a procedural
 * ephemeris matching the published mission profile, calibrated so its phase
 * boundaries (TLI, perilune, splashdown) line up with real JPL Horizons event
 * timestamps. We render against the app's artistically-scaled scene (Moon at
 * scene radius 2.0, ~5x its real-distance ratio) rather than the raw ~384,400
 * km Horizons coordinates, because real-scale Artemis lives entirely inside a
 * pixel and a half on the screen — see the PR description for the four
 * approaches we considered before settling on this one.
 *
 * Coordinate system: Earth-centered, scene units. The trajectory lies in the
 * y=0 plane (Earth-Moon orbital plane approximation). 1 scene unit ≈ 192,200
 * km, but only the relative geometry matters here — the actual km figure
 * never appears in the math.
 *
 * Calibration source: JPL Horizons NAIF ID -1024 (Orion "Integrity"), pulled
 * for the window 2026-04-02 02:00 UTC → 2026-04-10 23:00 UTC. Real mission
 * event timestamps used as phase boundaries:
 *
 *   Launch     2026-04-01 22:35:00 UTC   (T+0)
 *   TLI burn   2026-04-02 23:49:00 UTC   (T+25h14m, ~10.76% of mission)
 *   Perilune   2026-04-06 23:01:00 UTC   (T+5d 0h 26m, ~51.37% of mission)
 *   Splashdown 2026-04-11 17:00:00 UTC   (T+9d 18h 25m, mission end)
 *
 * The procedural model places "apogee" of the post-TLI ellipse at the
 * perilune wall-clock time (in our model the spacecraft is at max distance
 * from Earth when it's closest to the Moon — true to within a few percent for
 * a free-return trajectory). Because the Moon catches up to the spacecraft
 * during outbound, perilune sits at ~45.5% of the way through phase 2 rather
 * than the geometric midpoint — phase 2 uses a non-uniform theta mapping to
 * make the wall clock match.
 */

const LAUNCH_ISO = '2026-04-01T22:35:00Z';
const SPLASHDOWN_ISO = '2026-04-11T17:00:00Z';
const TLI_ISO = '2026-04-02T23:49:00Z';
const PERILUNE_ISO = '2026-04-06T23:01:00Z';

const LAUNCH_MS = Date.parse(LAUNCH_ISO);
const DURATION_MS = Date.parse(SPLASHDOWN_ISO) - LAUNCH_MS;

/** Fraction of mission duration at which the TLI burn fires. */
const T_TLI = (Date.parse(TLI_ISO) - LAUNCH_MS) / DURATION_MS; // ≈ 0.1076
/** Fraction of mission duration at perilune (closest approach to Moon). */
const T_PERILUNE = (Date.parse(PERILUNE_ISO) - LAUNCH_MS) / DURATION_MS; // ≈ 0.5137
/** Where in *phase 2* (post-TLI) perilune lands, as a fraction. */
const U_PERILUNE_IN_PHASE_2 = (T_PERILUNE - T_TLI) / (1 - T_TLI); // ≈ 0.4551

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
 * Phase 1 — High Earth parking orbit. One revolution of an elliptical orbit
 *   (perigee on the −X side, apogee partway toward the Moon). Real mission:
 *   perigee 563 km, apogee 70,000 km, ~25 hours.
 *
 * Phase 2 — Trans-Lunar Injection burn at perigee. The perigee stays put;
 *   the apogee stretches all the way out past the Moon. The spacecraft then
 *   traces this much larger ellipse — outbound through the −Z half, "lazy
 *   U-turn" at apogee (which sits just past the Moon), and return through
 *   the +Z half. One full revolution, ending back at perigee for re-entry.
 *
 * Both ellipses share the same perigee point and tangent direction, so the
 * transition is smooth (the TLI burn just adds speed along the existing
 * velocity vector).
 *
 * Phase 2 uses a piecewise-linear theta(u) mapping rather than uniform, so
 * apogee (theta = π) lines up with the real perilune wall-clock time
 * (~45.5% of phase 2 instead of the geometric 50%). This matches the
 * outbound-slow / return-fast asymmetry of the real free-return trajectory.
 */
function trajectoryAt(t: number): [number, number, number] {
  // Geometry — parking orbit (artistically scaled to be visible alongside Earth)
  const PARK_PERIGEE = 0.42; // just outside Earth's visual radius (~0.32)
  const PARK_APOGEE = 0.85;  // ~40% of the way to the Moon
  const PERIGEE_ANGLE = Math.PI; // perigee at −X so the ellipse extends toward +X (Moon)

  // Geometry — post-TLI free-return ellipse.
  // Apogee is pushed past the Moon's visual radius (~0.139 in scene units)
  // plus a buffer so the spacecraft visibly clears the Moon at U-turn.
  const TLI_PERIGEE = 0.42;  // same perigee as parking orbit (TLI fires here)
  const TLI_APOGEE = 2.30;   // ~0.30 past Moon center → clear of Moon's visual sphere

  let xz: [number, number];

  if (t < T_TLI) {
    // Phase 1: parking orbit — one full CCW revolution starting at perigee.
    const u = t / T_TLI;
    const theta = u * Math.PI * 2;
    xz = ellipsePoint(PARK_PERIGEE, PARK_APOGEE, PERIGEE_ANGLE, theta);
  } else {
    // Phase 2: post-TLI free-return — one full CCW revolution.
    const u = (t - T_TLI) / (1 - T_TLI);
    // Non-uniform theta(u): outbound (theta 0 → π) covers U_PERILUNE_IN_PHASE_2
    // of the wall-clock; return (theta π → 2π) covers the rest.
    let theta: number;
    if (u < U_PERILUNE_IN_PHASE_2) {
      theta = (u / U_PERILUNE_IN_PHASE_2) * Math.PI;
    } else {
      theta = Math.PI + ((u - U_PERILUNE_IN_PHASE_2) / (1 - U_PERILUNE_IN_PHASE_2)) * Math.PI;
    }
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
function generateEphemeris(): MissionEphemerisPoint[] {
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
  ephemeris: generateEphemeris(),
};
