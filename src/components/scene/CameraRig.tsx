import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { NavigationState, Planet } from '../../types/celestialBody';
import { getPlanetPosition, getMoonPosition } from '../../utils/planetPositions';
import { getMoonById } from '../../data/moons';

interface CameraRigProps {
  nav: NavigationState;
  planets: Planet[];
}

const SYSTEM_POSITION = new THREE.Vector3(0, 35, 50);
const SYSTEM_TARGET = new THREE.Vector3(0, 0, 0);

export function CameraRig({ nav, planets }: CameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const targetPos = useRef(SYSTEM_POSITION.clone());
  const targetLook = useRef(SYSTEM_TARGET.clone());
  const prevTargetLook = useRef(SYSTEM_TARGET.clone());

  const trackingPlanetId = useRef<string | null>(null);
  const trackingMoonId = useRef<string | null>(null);

  // Phase: 'flying' during the fly-in animation, 'settled' once the user can orbit
  const phase = useRef<'flying' | 'settled'>('settled');
  const animProgress = useRef(1);

  const resetFlyIn = useCallback(() => {
    phase.current = 'flying';
    animProgress.current = 0;
  }, []);

  useEffect(() => {
    if (nav.level === 'system') {
      targetPos.current.copy(SYSTEM_POSITION);
      targetLook.current.copy(SYSTEM_TARGET);
      trackingPlanetId.current = null;
      trackingMoonId.current = null;
    } else if (nav.level === 'sun') {
      targetPos.current.set(0, 2, 6);
      targetLook.current.set(0, 0, 0);
      trackingPlanetId.current = null;
      trackingMoonId.current = null;
    } else if (nav.level === 'planet') {
      trackingPlanetId.current = nav.planetId;
      trackingMoonId.current = null;
    } else if (nav.level === 'moon') {
      trackingPlanetId.current = nav.planetId;
      trackingMoonId.current = nav.moonId;
    }
    resetFlyIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- planets is a stable list; only react to nav changes
  }, [nav, resetFlyIn]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // --- Update target positions for tracked bodies ---
    if (trackingMoonId.current) {
      const moonPos = getMoonPosition(trackingMoonId.current);
      const moon = getMoonById(trackingMoonId.current);
      if (moonPos && moon) {
        targetLook.current.copy(moonPos);
        if (phase.current === 'flying') {
          const moonRadius = Math.max(moon.diameter / 8000, 0.06);
          const dist = moonRadius * 8 + 0.5;
          targetPos.current.set(
            moonPos.x,
            moonPos.y + dist * 0.3,
            moonPos.z + dist,
          );
        }
      }
    } else if (trackingPlanetId.current) {
      const planet = planets.find(p => p.id === trackingPlanetId.current);
      const pos = getPlanetPosition(trackingPlanetId.current);
      if (planet && pos) {
        targetLook.current.copy(pos);
        if (phase.current === 'flying') {
          const dist = planet.visualRadius * 5 + 2;
          targetPos.current.set(
            pos.x,
            pos.y + dist * 0.4,
            pos.z + dist,
          );
        }
      }
    }

    if (phase.current === 'flying') {
      // Disable user interaction during fly-in
      controls.enabled = false;

      const lerpSpeed = 1 - Math.pow(0.001, delta);

      camera.position.lerp(targetPos.current, lerpSpeed);
      controls.target.lerp(targetLook.current, lerpSpeed);
      camera.lookAt(controls.target);

      animProgress.current += delta;
      const distToTarget = camera.position.distanceTo(targetPos.current);
      if (distToTarget < 0.05 && animProgress.current > 0.5) {
        phase.current = 'settled';
        controls.enabled = true;
        // Snapshot so we can compute deltas for tracking
        prevTargetLook.current.copy(targetLook.current);
      }
    } else {
      // Settled: user can orbit freely via OrbitControls.
      // We just shift the controls target (and camera) to follow the orbiting body.
      const isTracking = !!(trackingPlanetId.current || trackingMoonId.current);
      if (isTracking) {
        const delta3 = new THREE.Vector3().subVectors(targetLook.current, prevTargetLook.current);
        if (delta3.lengthSq() > 0.000001) {
          controls.target.add(delta3);
          camera.position.add(delta3);
        }
        prevTargetLook.current.copy(targetLook.current);
      }
    }
  });

  // Compute distance constraints based on what we're looking at
  let minDist = 15;
  let maxDist = 100;

  if (nav.level === 'sun') {
    minDist = 3;
    maxDist = 15;
  } else if (nav.level === 'planet') {
    const planet = planets.find(p => p.id === nav.planetId);
    if (planet) {
      minDist = planet.visualRadius * 2;
      maxDist = planet.visualRadius * 15 + 5;
    }
  } else if (nav.level === 'moon') {
    const moon = getMoonById(nav.moonId);
    if (moon) {
      const moonRadius = Math.max(moon.diameter / 8000, 0.06);
      minDist = moonRadius * 3;
      maxDist = moonRadius * 20 + 2;
    }
  }

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={minDist}
      maxDistance={maxDist}
      maxPolarAngle={Math.PI * 0.85}
      enableDamping
      dampingFactor={0.1}
    />
  );
}
