import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';

const DEG2RAD = Math.PI / 180;

interface TerrestrialRigProps {
  /** When true, camera follows device orientation instead of manual drag */
  deviceOrientation?: boolean;
  /** Ref to compass heading in degrees (0=N). Read per-frame. */
  headingRef?: React.RefObject<number | null>;
  /** Ref to phone pitch (beta) in degrees (0=flat, 90=upright). Read per-frame. */
  pitchRef?: React.RefObject<number | null>;
}

/**
 * Camera fixed at the origin (observer on Earth), looking up/around
 * in altitude-azimuth style. Supports device orientation for mobile.
 */
export function TerrestrialRig({ deviceOrientation, headingRef, pitchRef }: TerrestrialRigProps) {
  const controlsRef = useRef<CameraControlsImpl>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Position camera at origin, looking up initially
    controls.setLookAt(0, 0, 0, 0, 50, 0, false);
    controls.smoothTime = 0.25;
  }, []);

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
