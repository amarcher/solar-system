import { useFocusedSpace } from '../../sceneLayout/useFocusedSpace';
import { focusLayoutShift } from '../../sceneLayout/focusedSpace';
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import { clearOrbitOccluder } from '../../utils/orbitClearance';
import { chooseFollowView, halfDiagonalFov } from '../../utils/followClearance';
import { planetDisplayExtent } from '../../utils/planetExtent';
import { moonVisualRadius, moonFocusDistance } from '../../utils/moonFraming';
import { CameraControls } from '@react-three/drei';
import type { NavigationState, Planet } from '../../types/celestialBody';
import { getPlanetPosition, getMoonPosition, getSmallBodyPosition } from '../../utils/planetPositions';
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
  /**
   * A selected Rubin find in the system view. 'follow' flies to it and keeps
   * it centered so zoom and rotate work around it; 'orbit' frames its whole
   * path around the Sun (fitRadius, scene units).
   */
  rubinFocus?: { id: string; view: 'follow' | 'orbit'; fitRadius: number; bodyRadius: number } | null;
}

/** Follow distance in rock radii: the rock fills a good part of the view, orbit lines still visible. */
const RUBIN_FOLLOW_RADII = 14;

// Artistic orbits span ~40 units; the log-compressed orrery only ~13.
// Each mode gets a default framing that fills the viewport with the system.
const SYSTEM_POSITION_ARTISTIC = { x: 0, y: 35, z: 50 };
const SYSTEM_POSITION_ORRERY = { x: 0, y: 15, z: 21 };
const SYSTEM_TARGET = { x: 0, y: 0, z: 0 };
const TWO_PI = Math.PI * 2;

/** Wrap accumulated orbit rotations so the next flight takes the short way round instead of unwinding every turn. */
function normalizeAzimuth(controls: CameraControlsImpl) {
  controls.azimuthAngle = ((controls.azimuthAngle % TWO_PI) + TWO_PI) % TWO_PI;
}

export function CameraRig({ nav, planets, orreryMissionId, rubinFocus = null }: CameraRigProps) {
  const space = useFocusedSpace();
  const layoutScratch = useRef({ shift: new Vector3(), target: new Vector3(), end: new Vector3() });
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
  const clearanceScratch = useRef({ position: new Vector3(), target: new Vector3(), endPosition: new Vector3(), endTarget: new Vector3(), corrected: new Vector3(), correctedEnd: new Vector3() });

  // Serialize nav so the effect only fires on actual changes
  const navKey = nav.level === 'moon'
    ? `moon:${nav.planetId}:${nav.moonId}`
    : nav.level === 'planet'
    ? `planet:${nav.planetId}`
    : nav.level === 'mission'
    ? `mission:${nav.missionId}`
    : nav.level;

  const rubinFocusId = nav.level === 'system' ? rubinFocus?.id ?? null : null;
  const rubinView = rubinFocus?.view ?? 'follow';
  const rubinFitRadius = rubinFocus?.fitRadius ?? 0;
  const rubinBodyRadius = rubinFocus?.bodyRadius ?? 0.05;
  const trackingRubinId = useRef<string | null>(null);
  const rubinScratch = useRef({ view: new Vector3(), origin: new Vector3() }).current;
  const wasTrackingRubin = useRef(false);
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
      normalizeAzimuth(controls);
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
      normalizeAzimuth(controls);
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

  // Declared after the nav effect so returning to the system view re-applies
  // the Rubin framing instead of the default whole-system shot.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || nav.level !== 'system') return;
    if (rubinFocusId && rubinView === 'follow') {
      trackingRubinId.current = rubinFocusId;
      wasTrackingRubin.current = true;
      flyInDone.current = false;
      flyInTime.current = 0;
      settled.current = false;
      return;
    }
    trackingRubinId.current = null;
    controls.smoothTime = flightSmoothTime;
    // Same as the planet flights: without this, closing or switching views
    // unwinds every orbit the user spun, circling several times before settling.
    normalizeAzimuth(controls);
    if (rubinFocusId) {
      // Whole orbit: center on the Sun and pull back until the path fits.
      const vFov = (camera instanceof PerspectiveCamera ? camera.fov : 50) * Math.PI / 180;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (size.width / size.height));
      controls.moveTo(SYSTEM_TARGET.x, SYSTEM_TARGET.y, SYSTEM_TARGET.z, true);
      controls.dollyTo(Math.max(controls.distance, rubinFitRadius / Math.sin(Math.min(vFov, hFov) / 2)), true);
      wasTrackingRubin.current = true;
    } else if (wasTrackingRubin.current) {
      // Deselected: hand the view back to the Sun without resetting the angle.
      controls.moveTo(SYSTEM_TARGET.x, SYSTEM_TARGET.y, SYSTEM_TARGET.z, true);
      controls.dollyTo(Math.max(controls.distance, 26), true);
      wasTrackingRubin.current = false;
    }
    settled.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rubinFocusId, rubinView, rubinFitRadius, nav.level]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const focusedRaw = (nav.level === 'planet' || nav.level === 'moon') ? space.raw.get(nav.planetId) : undefined;
    if (focusedRaw && !orreryMissionId) {
      const s = layoutScratch.current;
      focusLayoutShift(space, focusedRaw, s.shift);
      if (s.shift.lengthSq() > 1e-16) {
        controls.getTarget(s.target, false).add(s.shift);
        controls.getTarget(s.end, true).add(s.shift);
        controls.moveTo(s.target.x, s.target.y, s.target.z, false);
        controls.moveTo(s.end.x, s.end.y, s.end.z, true);
        controls.update(0);
      }
    }
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
          // Preserve the focused body under accelerated time once the flight settles.
          controls.moveTo(pos.x, pos.y, pos.z, !settled.current && !reducedMotion);
        }
      }
    } else if (trackingRubinId.current && nav.level === 'system') {
      const pos = getSmallBodyPosition(trackingRubinId.current);
      if (pos) {
        if (!flyInDone.current) {
          controls.smoothTime = flightSmoothTime;
          // Arrive on the sunlit side so low sunlight rakes across the craters,
          // but never with a planet filling the background (e.g. Uranus behind
          // 2025 PN7 on some dates): try a few nearby angles and keep one clear.
          const sun = getPlanetPosition('sun') ?? rubinScratch.origin;
          const bodies = planets.flatMap((planet) => {
            const position = getPlanetPosition(planet.id);
            return position ? [{ position, radius: planetDisplayExtent(planet) * 1.3 }] : [];
          });
          const fov = camera instanceof PerspectiveCamera ? camera.fov : 50;
          const view = chooseFollowView(pos, sun, rubinBodyRadius * RUBIN_FOLLOW_RADII, bodies,
            halfDiagonalFov(fov, size.width / size.height), rubinScratch.view);
          normalizeAzimuth(controls);
          controls.setLookAt(view.x, view.y, view.z, pos.x, pos.y, pos.z, !reducedMotion);
          flyInDone.current = true;
          flyInTime.current = 0;
        } else {
          controls.moveTo(pos.x, pos.y, pos.z, !settled.current && !reducedMotion);
        }
      }
    }
  }, -1.5);

  // Drei updates controls at -1. Keep compact moon close-ups clear of their parent
  // before rendering, preserving both its current zoom and any fly-in endpoint.
  useFrame(() => {
    if (mode !== 'orrery' || nav.level !== 'moon' || orreryMissionId) return;
    const controls = controlsRef.current;
    const parentPosition = getPlanetPosition(nav.planetId);
    const parent = planets.find(planet => planet.id === nav.planetId);
    if (!controls || !parentPosition || !parent) return;
    const s = clearanceScratch.current;
    controls.getPosition(s.position, false);
    controls.getTarget(s.target, false);
    // Include clouds and a near-plane margin, even on a wide viewport.
    const radius = parent.visualRadius * 1.015 + 0.01;
    if (!clearOrbitOccluder(s.position, s.target, parentPosition, radius, s.corrected)) return;
    controls.getPosition(s.endPosition, true);
    controls.getTarget(s.endTarget, true);
    clearOrbitOccluder(s.endPosition, s.endTarget, parentPosition, radius, s.correctedEnd);
    controls.setLookAt(...s.corrected.toArray(), ...s.target.toArray(), false);
    controls.setLookAt(...s.correctedEnd.toArray(), ...s.endTarget.toArray(), true);
    controls.update(0);
  }, -0.5);

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
  } else if (rubinFocusId && rubinView === 'follow') {
    minDist = rubinBodyRadius * 3;
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
