import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Group, Quaternion, Vector3 } from 'three';
import type { Mission, MissionEphemerisPoint } from '../../types/mission';
import { clearMissionPosition, setMissionPosition } from '../../utils/missionPositions';
import { getMoonPosition, getPlanetPosition } from '../../utils/planetPositions';
import { OrionSpacecraft } from './OrionSpacecraft';

interface MissionTrajectoryProps {
  mission: Mission;
}

const FORWARD = new Vector3(0, 0, 1);

/**
 * Sample the ephemeris at a wall-clock millisecond. Linear interpolation
 * between bracketing points. Outside the mission window, wraps modulo
 * duration so the trajectory replays once the mission ends.
 */
function sampleEphemeris(
  ephemeris: MissionEphemerisPoint[],
  nowMs: number,
): { pos: [number, number, number]; vel: [number, number, number] } {
  const startMs = Date.parse(ephemeris[0].t);
  const endMs = Date.parse(ephemeris[ephemeris.length - 1].t);
  const duration = endMs - startMs;
  let t = nowMs;
  if (t > endMs) {
    // Replay loop
    t = startMs + ((nowMs - startMs) % duration);
  }
  if (t < startMs) t = startMs;

  // Binary search for bracketing pair
  let lo = 0;
  let hi = ephemeris.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    const midMs = Date.parse(ephemeris[mid].t);
    if (midMs <= t) lo = mid;
    else hi = mid;
  }
  const a = ephemeris[lo];
  const b = ephemeris[hi];
  const aMs = Date.parse(a.t);
  const bMs = Date.parse(b.t);
  const span = bMs - aMs;
  const u = span > 0 ? (t - aMs) / span : 0;

  const pos: [number, number, number] = [
    a.x + (b.x - a.x) * u,
    a.y + (b.y - a.y) * u,
    a.z + (b.z - a.z) * u,
  ];
  const vel: [number, number, number] = [
    b.x - a.x,
    b.y - a.y,
    b.z - a.z,
  ];
  return { pos, vel };
}

/**
 * Renders one mission inside its frame's group: a glowing trajectory line
 * plus the live spacecraft sitting at its current ephemeris-derived position.
 *
 * The spacecraft's clock is `Date.now()` — independent of the sim's paused
 * state. When the user toggles the mission layer and the planets freeze,
 * the spacecraft naturally continues to inch along its real-time path.
 */
export function MissionTrajectory({ mission }: MissionTrajectoryProps) {
  const ephemeris = mission.ephemeris;
  // Wrapper rotates the canonical (+X = Moon) trajectory frame to align with
  // the actual Moon's current direction. Snapshot once on first frame so the
  // alignment is frozen for the duration of the mission view.
  const wrapperRef = useRef<Group>(null);
  const alignmentCaptured = useRef(false);

  const groupRef = useRef<Group>(null);
  const worldPos = useRef(new Vector3());
  const velVec = useRef(new Vector3());
  const quat = useRef(new Quaternion());

  const linePoints = useMemo<[number, number, number][]>(
    () => ephemeris.map((p) => [p.x, p.y, p.z]),
    [ephemeris],
  );

  // Clear stale spacecraft position when this mission unmounts so the
  // next time the user opens mission view, CameraRig waits for a fresh
  // position rather than flying to wherever the spacecraft *was*.
  useEffect(() => {
    return () => clearMissionPosition(mission.id);
  }, [mission.id]);

  useFrame(() => {
    // Lazy moon-alignment snapshot. We can't compute this in useMemo because
    // the moon position store may not be populated until after the first
    // useFrame tick in the parent group.
    if (!alignmentCaptured.current && wrapperRef.current
        && mission.frame.kind === 'planet-local') {
      const moon = getMoonPosition('moon');
      const earth = getPlanetPosition(mission.frame.planetId);
      if (moon && earth) {
        const dx = moon.x - earth.x;
        const dz = moon.z - earth.z;
        // Rotate +X to (dx, dz) under three.js right-handed Y rotation.
        wrapperRef.current.rotation.y = Math.atan2(-dz, dx);
        alignmentCaptured.current = true;
      }
    }

    if (!groupRef.current || ephemeris.length < 2) return;
    const { pos, vel } = sampleEphemeris(ephemeris, Date.now());
    groupRef.current.position.set(pos[0], pos[1], pos[2]);

    // Orient along velocity vector (forward = +Z in OrionSpacecraft local space)
    velVec.current.set(vel[0], vel[1], vel[2]);
    if (velVec.current.lengthSq() > 1e-10) {
      velVec.current.normalize();
      quat.current.setFromUnitVectors(FORWARD, velVec.current);
      groupRef.current.quaternion.copy(quat.current);
    }

    // Broadcast world position so CameraRig can find us. Use the spacecraft
    // group (inside the rotated wrapper) so the world position correctly
    // reflects the moon-aligned local position.
    groupRef.current.getWorldPosition(worldPos.current);
    setMissionPosition(mission.id, worldPos.current.x, worldPos.current.y, worldPos.current.z);
  });

  return (
    <group ref={wrapperRef}>
      <Line
        points={linePoints}
        color={mission.color}
        lineWidth={1.5}
        transparent
        opacity={0.75}
      />
      <group ref={groupRef}>
        <OrionSpacecraft accentColor={mission.color} />
      </group>
    </group>
  );
}
