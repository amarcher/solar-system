import { useRef, useEffect } from 'react';
import { CameraControls } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';

/**
 * Camera fixed at the origin (observer on Earth), looking up/around
 * in altitude-azimuth style. The user pans to look around the sky dome.
 */
export function TerrestrialRig() {
  const controlsRef = useRef<CameraControlsImpl>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Position camera at origin, looking toward zenith initially
    controls.setLookAt(0, 0, 0, 0, 50, 0, false);
    controls.smoothTime = 0.25;
  }, []);

  return (
    <CameraControls
      ref={controlsRef}
      // Lock camera at origin — no panning or dollying
      minDistance={0.01}
      maxDistance={0.01}
      dragToOffset={false}
      // Allow full rotation to look around the sky
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      draggingSmoothTime={0.08}
    />
  );
}
