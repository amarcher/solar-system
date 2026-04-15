import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type { NavigationState, Planet } from '../../types/celestialBody';
import { getPlanetPosition, getMoonPosition } from '../../utils/planetPositions';
import { getMissionPosition } from '../../utils/missionPositions';
import { getMoonById } from '../../data/moons';
import type CameraControlsImpl from 'camera-controls';

interface CameraRigProps {
  nav: NavigationState;
  planets: Planet[];
  /** When set, camera continuously tracks this mission in orrery mode */
  orreryMissionId?: string;
}

const SYSTEM_POSITION = { x: 0, y: 35, z: 50 };
const SYSTEM_TARGET = { x: 0, y: 0, z: 0 };

export function CameraRig({ nav, planets, orreryMissionId }: CameraRigProps) {
  const controlsRef = useRef<CameraControlsImpl>(null);

  const trackingPlanetId = useRef<string | null>(null);
  const trackingMoonId = useRef<string | null>(null);
  const trackingMissionId = useRef<string | null>(null);
  const settled = useRef(false);

  // Serialize nav so the effect only fires on actual changes
  const navKey = nav.level === 'moon'
    ? `moon:${nav.planetId}:${nav.moonId}`
    : nav.level === 'planet'
    ? `planet:${nav.planetId}`
    : nav.level === 'mission'
    ? `mission:${nav.missionId}`
    : nav.level;

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    settled.current = false;

    if (nav.level === 'system') {
      trackingPlanetId.current = null;
      trackingMoonId.current = null;
      trackingMissionId.current = null;
      // Normalize azimuth to prevent unwinding accumulated orbit rotations
      const TWO_PI = Math.PI * 2;
      controls.azimuthAngle = ((controls.azimuthAngle % TWO_PI) + TWO_PI) % TWO_PI;
      controls.smoothTime = 1.0;
      controls.setLookAt(
        SYSTEM_POSITION.x, SYSTEM_POSITION.y, SYSTEM_POSITION.z,
        SYSTEM_TARGET.x, SYSTEM_TARGET.y, SYSTEM_TARGET.z,
        true,
      );
      // System view settles immediately (no tracking needed)
      settled.current = true;
    } else if (nav.level === 'sun') {
      trackingPlanetId.current = null;
      trackingMoonId.current = null;
      trackingMissionId.current = null;
      const TWO_PI = Math.PI * 2;
      controls.azimuthAngle = ((controls.azimuthAngle % TWO_PI) + TWO_PI) % TWO_PI;
      controls.smoothTime = 1.0;
      controls.setLookAt(0, 2, 6, 0, 0, 0, true);
      settled.current = true;
    } else if (nav.level === 'planet') {
      trackingPlanetId.current = nav.planetId;
      trackingMoonId.current = null;
      trackingMissionId.current = null;
      // Fly-in will be triggered in the first useFrame once we have a position
    } else if (nav.level === 'moon') {
      trackingPlanetId.current = nav.planetId;
      trackingMoonId.current = nav.moonId;
      trackingMissionId.current = null;
    } else if (nav.level === 'mission') {
      trackingPlanetId.current = null;
      trackingMoonId.current = null;
      trackingMissionId.current = nav.missionId;
      // Fly-in triggered once mission position is registered
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navKey]);

  const flyInDone = useRef(false);
  const flyInTime = useRef(0);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // After fly-in animation settles, reduce smooth time for responsive tracking
    if (!settled.current && flyInDone.current) {
      flyInTime.current += delta;
      if (flyInTime.current > 1.2) {
        settled.current = true;
        controls.smoothTime = 0.25;
      }
    }

    // --- Orrery mission: continuously track the spacecraft ---
    if (orreryMissionId) {
      const missionPos = getMissionPosition(orreryMissionId);
      if (missionPos) {
        if (!flyInDone.current) {
          controls.smoothTime = 1.0;
          controls.moveTo(missionPos.x, missionPos.y, missionPos.z, true);
          controls.dollyTo(0.8, true); // Close enough to see Earth-Moon-trajectory
          flyInDone.current = true;
          flyInTime.current = 0;
        } else {
          // Continuously follow the moving spacecraft
          controls.moveTo(missionPos.x, missionPos.y, missionPos.z, true);
        }
      }
      return; // Skip other tracking
    }

    // --- Track moving bodies ---
    if (trackingMissionId.current) {
      const missionPos = getMissionPosition(trackingMissionId.current);
      if (missionPos && !flyInDone.current) {
        controls.smoothTime = 1.0;
        controls.moveTo(missionPos.x, missionPos.y, missionPos.z, true);
        controls.dollyTo(0.12, true);
        flyInDone.current = true;
        flyInTime.current = 0;
      }
      // Once parked, do NOT continuously re-center — leave the user free
      // to orbit/pan around the (frozen) spacecraft.
    } else if (trackingMoonId.current) {
      const moonPos = getMoonPosition(trackingMoonId.current);
      const moon = getMoonById(trackingMoonId.current);
      if (moonPos && moon) {
        if (!flyInDone.current) {
          const moonRadius = Math.max(moon.diameter / 8000, 0.06);
          const dist = moonRadius * 8 + 0.5;
          controls.smoothTime = 1.0;
          controls.moveTo(moonPos.x, moonPos.y, moonPos.z, true);
          controls.dollyTo(dist, true);
          flyInDone.current = true;
          flyInTime.current = 0;
        } else {
          // Continuously track the orbiting moon
          controls.moveTo(moonPos.x, moonPos.y, moonPos.z, true);
        }
      }
    } else if (trackingPlanetId.current) {
      const planet = planets.find(p => p.id === trackingPlanetId.current);
      const pos = getPlanetPosition(trackingPlanetId.current);
      if (planet && pos) {
        if (!flyInDone.current) {
          const dist = planet.visualRadius * 5 + 2;
          controls.smoothTime = 1.0;
          controls.moveTo(pos.x, pos.y, pos.z, true);
          controls.dollyTo(dist, true);
          flyInDone.current = true;
          flyInTime.current = 0;
        } else {
          // Continuously track the orbiting planet
          controls.moveTo(pos.x, pos.y, pos.z, true);
        }
      }
    }
  });

  // Reset flyInDone when orrery mission changes
  useEffect(() => {
    if (orreryMissionId) {
      flyInDone.current = false;
      flyInTime.current = 0;
      settled.current = false;
    }
  }, [orreryMissionId]);

  // Reset flyInDone when nav changes
  useEffect(() => {
    flyInDone.current = false;
    flyInTime.current = 0;
  }, [navKey]);

  // Distance constraints per nav level
  let minDist = 15;
  let maxDist = 100;

  if (nav.level === 'sun') {
    minDist = 2;
    maxDist = 15;
  } else if (nav.level === 'planet') {
    const planet = planets.find(p => p.id === nav.planetId);
    if (planet) {
      minDist = planet.visualRadius * 1.5;
      maxDist = planet.visualRadius * 20 + 10;
    }
  } else if (nav.level === 'moon') {
    const moon = getMoonById(nav.moonId);
    if (moon) {
      const moonRadius = Math.max(moon.diameter / 8000, 0.06);
      minDist = moonRadius * 2;
      maxDist = moonRadius * 25 + 3;
    }
  } else if (nav.level === 'mission') {
    minDist = 0.02;
    maxDist = 8;
  }

  return (
    <CameraControls
      ref={controlsRef}
      minDistance={minDist}
      maxDistance={maxDist}
      maxPolarAngle={Math.PI * 0.85}
      draggingSmoothTime={0.1}
    />
  );
}
