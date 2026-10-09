import { useCallback, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';
import { useAstronomy } from '../../astronomy/useAstronomy';
import * as AstronomyService from '../../astronomy/AstronomyService';
import { lookAtBody, openingLook, shortestTurn, type SkyBody, type SkyLook } from '../../astronomy/skyFinder';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const DEG2RAD = Math.PI / 180;

/** Bodies the opening view may face; see openingLook. */
const OPENING_BODIES = ['venus', 'jupiter', 'mars', 'saturn', 'moon', 'mercury'];

/** A request to turn the view toward a point in the sky. `key` changes per request. */
export interface SkyLookRequest extends SkyLook {
  key: number;
}

interface TerrestrialRigProps {
  /** When true, camera follows device orientation instead of manual drag */
  deviceOrientation?: boolean;
  /** Ref to compass heading in degrees (0=N). Read per-frame. */
  headingRef?: React.RefObject<number | null>;
  /** Ref to phone pitch (beta) in degrees (0=flat, 90=upright). Read per-frame. */
  pitchRef?: React.RefObject<number | null>;
  /** Turn toward this point (the finder's "show me Saturn"). */
  look?: SkyLookRequest | null;
}

/**
 * Camera fixed at the origin (observer on Earth), looking up/around
 * in altitude-azimuth style. Supports device orientation for mobile.
 */
export function TerrestrialRig({ deviceOrientation, headingRef, pitchRef, look }: TerrestrialRigProps) {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const { engineReady, observer, timeRef } = useAstronomy();
  const reducedMotion = useReducedMotion();
  // Once the user has steered (drag or finder), the opening view stops re-aiming.
  const steered = useRef(false);
  const opened = useRef(false);

  // The camera orbits a target 0.01 away, looking through it: a look
  // direction of (azimuth, altitude) is orbit angles (-azimuth, 90° + altitude).
  const turnTo = useCallback((target: SkyLook, animate: boolean) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const azimuth = controls.azimuthAngle + shortestTurn(controls.azimuthAngle, -target.azimuth * DEG2RAD);
    controls.rotateTo(azimuth, Math.PI / 2 + target.altitude * DEG2RAD, animate);
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Position camera at origin, looking up initially
    // Match the constrained orbit distance so camera-controls cannot lift
    // the observer 50 units above the ground when it clamps the distance.
    controls.setLookAt(0, 0, 0, 0, 0.01, 0, false);
    controls.smoothTime = 0.25;

    const onSteer = () => { steered.current = true; };
    controls.addEventListener('controlstart', onSteer);
    return () => controls.removeEventListener('controlstart', onSteer);
  }, []);

  // Open facing the planets rather than the (usually empty) zenith. Re-aim
  // when geolocation lands a moment later, unless the user has already steered.
  useEffect(() => {
    if (!engineReady || steered.current || deviceOrientation) return;
    const date = new Date(timeRef.current);
    const bodies: SkyBody[] = [];
    for (const id of OPENING_BODIES) {
      try {
        bodies.push({ id, name: id, ...AstronomyService.getHorizontalPosition(id, date, observer) });
      } catch { /* skip a body the engine cannot place */ }
    }
    turnTo(openingLook(bodies, observer.latitude), opened.current && !reducedMotion);
    opened.current = true;
  }, [engineReady, observer, deviceOrientation, timeRef, turnTo, reducedMotion]);

  useEffect(() => {
    if (!look) return;
    steered.current = true;
    turnTo(lookAtBody(look), !reducedMotion);
    // A request is identified by its key; the angles ride along with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look?.key]);

  // When device orientation is active, disable manual controls and drive
  // the camera from gyroscope/compass.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (deviceOrientation) {
      // Disable user drag so it doesn't fight the gyroscope
      controls.enabled = false;
    } else {
      controls.enabled = true;
    }
  }, [deviceOrientation]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls || !deviceOrientation || !headingRef || !pitchRef) return;

    const heading = headingRef.current;
    const beta = pitchRef.current;
    if (heading === null || beta === null) return;

    // Convert device orientation to camera look direction:
    //
    // Heading (alpha/compass): 0=N, 90=E, 180=S, 270=W
    // In our scene: azimuth 0 = looking toward -Z (North)
    // CameraControls azimuthAngle: 0 = looking toward +X, increases CCW
    // So azimuth = -(heading - 90) in radians = (90 - heading) * DEG2RAD
    const azimuth = (90 - heading) * DEG2RAD;

    // Beta (phone tilt): 0=flat on table, 90=upright, >90=tilting toward ground
    // CameraControls polarAngle: 0 = looking up (+Y), PI = looking down (-Y)
    // Direct mapping: beta° → polar radians
    //   flat (0°)   → polar=0   → zenith  ✓
    //   upright (90°) → polar=π/2 → horizon ✓
    //   tilted down (>90°) → polar>π/2 → below horizon ✓
    const polar = Math.max(0, Math.min(Math.PI, beta * DEG2RAD));

    // Apply smoothly — CameraControls will lerp
    controls.rotateTo(azimuth, polar, false);
  });

  return (
    <CameraControls
      ref={controlsRef}
      minDistance={0.01}
      maxDistance={0.01}
      dragToOffset={false}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      draggingSmoothTime={0.08}
    />
  );
}
