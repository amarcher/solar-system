import { useCallback, useEffect, useRef, useState } from 'react';

export interface DeviceOrientationState {
  /** Compass heading in degrees (0=N, 90=E, 180=S, 270=W). null if unavailable. */
  heading: number | null;
  /** Pitch in degrees (phone beta: 0=flat, 90=upright). null if unavailable. */
  pitch: number | null;
  /** Whether device orientation is actively being tracked */
  active: boolean;
  /** Whether the device supports orientation events */
  supported: boolean;
  /** Whether iOS permission has been denied */
  denied: boolean;
  /** Start tracking (requests iOS permission if needed — must be called from user gesture) */
  start: () => void;
  /** Stop tracking */
  stop: () => void;
  /** Ref for per-frame heading reads (avoids re-renders) */
  headingRef: React.RefObject<number | null>;
  /** Ref for per-frame pitch reads (avoids re-renders) */
  pitchRef: React.RefObject<number | null>;
}

function needsPermissionRequest(): boolean {
  return typeof (DeviceOrientationEvent as any).requestPermission === 'function';
}

function isSupported(): boolean {
  return typeof DeviceOrientationEvent !== 'undefined';
}

export function useDeviceOrientation(): DeviceOrientationState {
  const [active, setActive] = useState(false);
  const [denied, setDenied] = useState(false);
  const [supported] = useState(isSupported);

  const headingRef = useRef<number | null>(null);
  const pitchRef = useRef<number | null>(null);

  // Low-frequency state for UI (updated ~4Hz)
  const [heading, setHeading] = useState<number | null>(null);
  const [pitch, setPitch] = useState<number | null>(null);

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (e.alpha !== null) {
      // webkitCompassHeading gives true-north heading on iOS
      // On Android, alpha is degrees from initial heading; we use 360-alpha as approximate compass
      const compassHeading = (e as any).webkitCompassHeading ?? (360 - e.alpha);
      headingRef.current = compassHeading % 360;
    }

    if (e.beta !== null) {
      // beta: 0=flat, 90=upright, >90=tilting backward
      pitchRef.current = e.beta;
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setHeading(headingRef.current);
      setPitch(pitchRef.current);
    }, 250);
    return () => clearInterval(id);
  }, [active]);

  const start = useCallback(() => {
    if (!supported) return;

    if (needsPermissionRequest()) {
      (DeviceOrientationEvent as any).requestPermission()
        .then((state: string) => {
          if (state === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true);
            setActive(true);
            setDenied(false);
          } else {
            setDenied(true);
          }
        })
        .catch(() => setDenied(true));
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
      setActive(true);
    }
  }, [supported, handleOrientation]);

  const stop = useCallback(() => {
    window.removeEventListener('deviceorientation', handleOrientation, true);
    setActive(false);
    headingRef.current = null;
    pitchRef.current = null;
    setHeading(null);
    setPitch(null);
  }, [handleOrientation]);

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [handleOrientation]);

  return { heading, pitch, active, supported, denied, start, stop, headingRef, pitchRef };
}
