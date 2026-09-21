import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { moonVisualRadius, moonFocusDistance } from '../../utils/moonFraming';
import { CameraControls } from '@react-three/drei';
import type { NavigationState, Planet } from '../../types/celestialBody';
import { getPlanetPosition, getMoonPosition } from '../../utils/planetPositions';
import { getMissionPosition } from '../../utils/missionPositions';
import { getMoonById } from '../../data/moons';
import { useAstronomy } from '../../astronomy/useAstronomy';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { benchmarkMode } from '../../performance/benchmark';
import type CameraControlsImpl from 'camera-controls';

interface CameraRigProps {
  nav: NavigationState;
  planets: Planet[];
  /** When set, camera continuously tracks this mission in orrery mode */
  orreryMissionId?: string;
}

// Artistic orbits span ~40 units; the log-compressed orrery only ~13.
// Each mode gets a default framing that fills the viewport with the system.
const SYSTEM_POSITION_ARTISTIC = { x: 0, y: 35, z: 50 };
const SYSTEM_POSITION_ORRERY = { x: 0, y: 15, z: 21 };
const SYSTEM_TARGET = { x: 0, y: 0, z: 0 };

export function CameraRig({ nav, planets, orreryMissionId }: CameraRigProps) {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const { mode } = useAstronomy();
  const { size, camera } = useThree();
  const framedView = useRef<{ navKey: string; mode: string } | null>(null);
  const reducedMotion = useReducedMotion();
  // With reduced motion, camera transitions snap instead of flying.
  const flightSmoothTime = reducedMotion ? 0.05 : 1.0;

  const trackingPlanetId = useRef<string | null>(null);
  const trackingMoonId = useRef<string | null>(null);
  const trackingMissionId = useRef<string | null>(null);
  const settled = useRef(false);
  const flyInDone = useRef(false);
  const flyInTime = useRef(0);

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
    const viewChanged = framedView.current?.navKey !== navKey || framedView.current.mode !== mode;
    framedView.current = { navKey, mode };
    // A viewport change should reframe tracked bodies, not discard a free
    // viewing angle in the whole-system or Sun view.
    if (!viewChanged && (nav.level === 'system' || nav.level === 'sun')) return;

    settled.current = false;
    flyInDone.current = false;
    flyInTime.current = 0;

    if (nav.level === 'system') {
      trackingPlanetId.current = null;
      trackingMoonId.current = null;
      trackingMissionId.current = null;
      // Normalize azimuth to prevent unwinding accumulated orbit rotations
      const TWO_PI = Math.PI * 2;
      controls.azimuthAngle = ((controls.azimuthAngle % TWO_PI) + TWO_PI) % TWO_PI;
      controls.smoothTime = flightSmoothTime;
      const systemPos = mode === 'orrery' ? SYSTEM_POSITION_ORRERY : SYSTEM_POSITION_ARTISTIC;
      controls.setLookAt(
        systemPos.x, systemPos.y, systemPos.z,
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
      controls.smoothTime = flightSmoothTime;
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
  }, [navKey, mode, size.width, size.height]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (benchmarkMode === 'orbit') void controls.rotate(delta * 0.15, 0, false);

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
          controls.smoothTime = flightSmoothTime;
          controls.moveTo(missionPos.x, missionPos.y, missionPos.z, true);
          controls.dollyTo(4, true); // Frame Earth-Moon-trajectory system
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
        controls.smoothTime = flightSmoothTime;
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
          const moonRadius = moonVisualRadius(moon.diameter, moon.id, mode);
          const dist = moonFocusDistance(moonRadius, camera instanceof PerspectiveCamera ? camera.fov : 50, size.width, size.height);
          controls.smoothTime = flightSmoothTime;
          if (trackingPlanetId.current === 'uranus') {
            // Voyager mapped the southern hemisphere. Move the camera to that
            // side; do not rotate the map or invent the unobserved north.
            controls.setLookAt(moonPos.x, moonPos.y - dist * 0.8, moonPos.z + dist * 0.6,
              moonPos.x, moonPos.y, moonPos.z, !reducedMotion);
          } else {
            controls.moveTo(moonPos.x, moonPos.y, moonPos.z, !reducedMotion);
            controls.dollyTo(dist, !reducedMotion);
          }
          flyInDone.current = true;
          flyInTime.current = 0;
        } else {
          // At close range, smoothing a moving target can leave the moon
          // outside the frame. Preserve the user's orbit offset while tracking
          // its center exactly once the initial flight has settled.
          controls.moveTo(moonPos.x, moonPos.y, moonPos.z, !settled.current && !reducedMotion);
        }
      }
    } else if (trackingPlanetId.current) {
      const planet = planets.find(p => p.id === trackingPlanetId.current);
      const pos = getPlanetPosition(trackingPlanetId.current);
      if (planet && pos) {
        if (!flyInDone.current) {
          const dist = planet.visualRadius * 5 + 2;
          controls.smoothTime = flightSmoothTime;
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
  }, -1.5);

  // Reset flyInDone when orrery mission changes
  useEffect(() => {
    if (orreryMissionId) {
      flyInDone.current = false;
      flyInTime.current = 0;
      settled.current = false;
    }
  }, [orreryMissionId]);

  // Distance constraints per nav level
  let minDist = mode === 'orrery' ? 3 : 15;
  let maxDist = 100;

  if (orreryMissionId) {
    minDist = 1;
    maxDist = 50;
  } else if (nav.level === 'sun') {
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
      const moonRadius = moonVisualRadius(moon.diameter, moon.id, mode);
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
