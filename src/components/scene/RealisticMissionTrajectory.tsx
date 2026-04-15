import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import { Color, Group, Quaternion, Vector3 } from 'three';
import type { Mission, MissionEphemerisPoint } from '../../types/mission';
import { usePlanetTexture } from '../../utils/textures';
import { clearMissionPosition, setMissionPosition } from '../../utils/missionPositions';
import { useAstronomy } from '../../astronomy/AstronomyContext';
import * as AstronomyService from '../../astronomy/AstronomyService';
import { scaleAU } from '../../astronomy/realisticScale';

interface RealisticMissionTrajectoryProps {
  mission: Mission;
}

const FORWARD = new Vector3(0, 0, 1);

/**
 * Sample the ephemeris at a given millisecond timestamp.
 * Linear interpolation between bracketing points.
 * Outside the mission window, clamps to the nearest end.
 */
function sampleEphemeris(
  ephemeris: MissionEphemerisPoint[],
  timeMs: number,
): { pos: [number, number, number]; vel: [number, number, number] } {
  const startMs = Date.parse(ephemeris[0].t);
  const endMs = Date.parse(ephemeris[ephemeris.length - 1].t);
  const t = Math.max(startMs, Math.min(endMs, timeMs));

  let lo = 0;
  let hi = ephemeris.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (Date.parse(ephemeris[mid].t) <= t) lo = mid;
    else hi = mid;
  }
  const a = ephemeris[lo];
  const b = ephemeris[hi];
  const aMs = Date.parse(a.t);
  const bMs = Date.parse(b.t);
  const span = bMs - aMs;
  const u = span > 0 ? (t - aMs) / span : 0;

  return {
    pos: [
      a.x + (b.x - a.x) * u,
      a.y + (b.y - a.y) * u,
      a.z + (b.z - a.z) * u,
    ],
    vel: [b.x - a.x, b.y - a.y, b.z - a.z],
  };
}

/**
 * Renders the Artemis mission trajectory in the orrery view.
 *
 * The trajectory data is in Earth-centered scene units (canonical: +X = Moon direction).
 * We scale these to match the orrery's log-compressed coordinate system and align
 * the trajectory to the real Moon direction at the current simulation time.
 *
 * Uses simulation time from AstronomyContext instead of Date.now(), so the user
 * can scrub through the mission timeline.
 */
export function RealisticMissionTrajectory({ mission }: RealisticMissionTrajectoryProps) {
  const { timeRef, engineReady } = useAstronomy();
  const ephemeris = mission.ephemeris;

  const wrapperRef = useRef<Group>(null);
  const groupRef = useRef<Group>(null);
  const worldPos = useRef(new Vector3());
  const velVec = useRef(new Vector3());
  const quat = useRef(new Quaternion());

  // The trajectory data uses canonical scene units where Moon ≈ 2.0 from Earth.
  // In the orrery's log-compressed space, the real Earth-Moon distance (0.00257 AU)
  // maps to ~0.055 units — invisible. We exaggerate the trajectory to be visually
  // meaningful: scale it so the Moon-distance apogee is ~1.5 orrery units, which
  // makes the flight path clearly visible near Earth without overwhelming the scene.
  const CANONICAL_MOON_DIST = 2.0;
  const VISIBLE_MOON_DIST = 1.5; // orrery units — visible but not huge
  const scaleFactor = VISIBLE_MOON_DIST / CANONICAL_MOON_DIST;

  // Pre-scale all line points
  const linePoints = useMemo<[number, number, number][]>(
    () => ephemeris.map((p) => [
      p.x * scaleFactor,
      p.y * scaleFactor,
      p.z * scaleFactor,
    ]),
    [ephemeris, scaleFactor],
  );

  useEffect(() => {
    return () => clearMissionPosition(mission.id);
  }, [mission.id]);

  useFrame(() => {
    if (!wrapperRef.current || !engineReady) return;

    const simTime = timeRef.current;
    const simDate = new Date(simTime);

    // Align trajectory to real Moon direction from astronomy-engine.
    // The trajectory's +X axis should point toward the Moon.
    try {
      const moonGeo = AstronomyService.getGeocentricPosition('moon', simDate);

      // Moon direction in the orrery's ecliptic frame:
      // Convert geocentric RA/Dec to a direction vector
      const raRad = moonGeo.ra * (Math.PI / 12); // hours → radians
      const decRad = moonGeo.dec * (Math.PI / 180);
      const cosDec = Math.cos(decRad);

      // Equatorial direction
      const eqX = cosDec * Math.cos(raRad);
      const eqY = cosDec * Math.sin(raRad);
      const eqZ = Math.sin(decRad);

      // Rotate equatorial → ecliptic (same transform as AstronomyService)
      const obliquity = 23.4393 * (Math.PI / 180);
      const cosE = Math.cos(obliquity);
      const sinE = Math.sin(obliquity);
      const eclX = eqX;
      const eclY = eqY * cosE + eqZ * sinE;

      // Map ecliptic to scene coords (same as RealisticPlanet)
      // Scene: x = ecliptic x, z = -ecliptic y
      const sceneX = eclX;
      const sceneZ = -eclY;

      // Rotate the trajectory wrapper so +X points toward Moon
      wrapperRef.current.rotation.y = Math.atan2(-sceneZ, sceneX);
    } catch { /* engine not ready */ }

    // Position the wrapper at Earth's location in the orrery
    try {
      const earthHelio = AstronomyService.getHeliocentricPosition('earth', simDate);
      wrapperRef.current.position.set(
        scaleAU(earthHelio.x),
        scaleAU(earthHelio.z),
        scaleAU(-earthHelio.y),
      );
    } catch { /* engine not ready */ }

    // Sample spacecraft position at sim time
    if (!groupRef.current || ephemeris.length < 2) return;
    const { pos, vel } = sampleEphemeris(ephemeris, simTime);
    groupRef.current.position.set(
      pos[0] * scaleFactor,
      pos[1] * scaleFactor,
      pos[2] * scaleFactor,
    );

    // Orient along velocity
    velVec.current.set(vel[0], vel[1], vel[2]);
    if (velVec.current.lengthSq() > 1e-10) {
      velVec.current.normalize();
      quat.current.setFromUnitVectors(FORWARD, velVec.current);
      groupRef.current.quaternion.copy(quat.current);
    }

    // Broadcast world position for camera tracking
    groupRef.current.getWorldPosition(worldPos.current);
    setMissionPosition(mission.id, worldPos.current.x, worldPos.current.y, worldPos.current.z);
  });

  // Moon radius: proportional to the exaggerated scale
  // Real Moon diameter ≈ 3474 km, Earth-Moon dist ≈ 384400 km
  // Ratio: 3474/384400 ≈ 0.009, so at VISIBLE_MOON_DIST=1.5, Moon radius ≈ 0.014
  // Exaggerate 8x so it's actually visible
  const moonRadius = 0.11;

  return (
    <group ref={wrapperRef}>
      <Line
        points={linePoints}
        color={mission.color}
        lineWidth={1.5}
        transparent
        opacity={0.6}
      />

      {/* Moon — positioned along +X at scaled Moon distance */}
      <group position={[VISIBLE_MOON_DIST, 0, 0]}>
        <TexturedMoon radius={moonRadius} />
        <Html
          center
          position={[0, -(moonRadius + 0.12), 0]}
          style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '10px',
            fontFamily: "'Space Grotesk', sans-serif",
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            textShadow: '0 1px 6px rgba(0,0,0,0.9)',
          }}
        >
          Moon
        </Html>
      </group>

      {/* Spacecraft */}
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={mission.color} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color={mission.color} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function TexturedMoon({ radius }: { radius: number }) {
  const diffuseMap = usePlanetTexture('moon');
  const meshRef = useRef<any>(null);
  const tintColor = useMemo(() => {
    if (diffuseMap) {
      const c = new Color('#ffffff');
      c.lerp(new Color('#c8c8c0'), 0.2);
      return c;
    }
    return new Color('#c8c8c0');
  }, [diffuseMap]);

  useEffect(() => {
    if (meshRef.current?.material && diffuseMap) {
      meshRef.current.material.map = diffuseMap;
      meshRef.current.material.needsUpdate = true;
    }
  }, [diffuseMap]);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        map={diffuseMap ?? undefined}
        color={tintColor}
        roughness={0.75}
        metalness={0}
      />
    </mesh>
  );
}
