import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type { NavigationState, Planet } from '../../types/celestialBody';
import { getPlanetPosition, getMoonPosition } from '../../utils/planetPositions';
import { getMoonById } from '../../data/moons';
import type CameraControlsImpl from 'camera-controls';

interface CameraRigProps {
  nav: NavigationState;
  planets: Planet[];
}

const SYSTEM_POSITION = { x: 0, y: 35, z: 50 };
const SYSTEM_TARGET = { x: 0, y: 0, z: 0 };

export function CameraRig({ nav, planets }: CameraRigProps) {
  const controlsRef = useRef<CameraControlsImpl>(null);

  const trackingPlanetId = useRef<string | null>(null);
  const trackingMoonId = useRef<string | null>(null);
  const settled = useRef(false);

  // Serialize nav so the effect only fires on actual changes
  const navKey = nav.level === 'moon'
    ? `moon:${nav.planetId}:${nav.moonId}`
    : nav.level === 'planet'
    ? `planet:${nav.planetId}`
    : nav.level;

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    settled.current = false;

    if (nav.level === 'system') {
      trackingPlanetId.current = null;
      trackingMoonId.current = null;
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
      controls.smoothTime = 1.0;
      controls.setLookAt(0, 2, 6, 0, 0, 0, true);
      settled.current = true;
    } else if (nav.level === 'planet') {
      trackingPlanetId.current = nav.planetId;
      trackingMoonId.current = null;
      // Fly-in will be triggered in the first useFrame once we have a position
    } else if (nav.level === 'moon') {
      trackingPlanetId.current = nav.planetId;
      trackingMoonId.current = nav.moonId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navKey]);

  const flyInDone = useRef(false);
  const flyInTime = useRef(0);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Count time since fly-in started
    if (!settled.current && flyInDone.current) {
      flyInTime.current += delta;
      // Wait for the fly-in animation to mostly complete before tracking
      if (flyInTime.current > 1.2) {
        settled.current = true;
        controls.smoothTime = 0.25;
      }
    }

    // --- Track moving bodies ---
    if (trackingMoonId.current) {
      const moonPos = getMoonPosition(trackingMoonId.current);
      const moon = getMoonById(trackingMoonId.current);
      if (moonPos && moon) {
        if (!settled.current && !flyInDone.current) {
          const moonRadius = Math.max(moon.diameter / 8000, 0.06);
          const dist = moonRadius * 8 + 0.5;
          controls.smoothTime = 1.0;
          controls.setLookAt(
            moonPos.x, moonPos.y + dist * 0.3, moonPos.z + dist,
            moonPos.x, moonPos.y, moonPos.z,
            true,
          );
          flyInDone.current = true;
          flyInTime.current = 0;
        } else if (settled.current) {
          // Smoothly track the orbiting moon
          controls.moveTo(moonPos.x, moonPos.y, moonPos.z, true);
        }
      }
    } else if (trackingPlanetId.current) {
      const planet = planets.find(p => p.id === trackingPlanetId.current);
      const pos = getPlanetPosition(trackingPlanetId.current);
      if (planet && pos) {
        if (!settled.current && !flyInDone.current) {
          const dist = planet.visualRadius * 5 + 2;
          controls.smoothTime = 1.0;
          controls.setLookAt(
            pos.x, pos.y + dist * 0.3, pos.z + dist,
            pos.x, pos.y, pos.z,
            true,
          );
          flyInDone.current = true;
          flyInTime.current = 0;
        } else if (settled.current) {
          // Smoothly track the orbiting planet
          controls.moveTo(pos.x, pos.y, pos.z, true);
        }
      }
    }
  });

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
