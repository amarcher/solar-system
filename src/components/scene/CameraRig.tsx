import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { NavigationState } from '../../types/celestialBody';
import type { Planet } from '../../types/celestialBody';

interface CameraRigProps {
  nav: NavigationState;
  planets: Planet[];
}

const SYSTEM_POSITION = new THREE.Vector3(0, 35, 50);
const SYSTEM_TARGET = new THREE.Vector3(0, 0, 0);

export function CameraRig({ nav, planets }: CameraRigProps) {
  const { camera } = useThree();
  const targetPos = useRef(SYSTEM_POSITION.clone());
  const targetLook = useRef(SYSTEM_TARGET.clone());
  const currentLook = useRef(SYSTEM_TARGET.clone());
  const isAnimating = useRef(false);
  const animProgress = useRef(1); // 1 = done, <1 = still animating

  useEffect(() => {
    if (nav.level === 'system') {
      targetPos.current.copy(SYSTEM_POSITION);
      targetLook.current.copy(SYSTEM_TARGET);
    } else if (nav.level === 'sun') {
      targetPos.current.set(0, 2, 6);
      targetLook.current.set(0, 0, 0);
    } else if (nav.level === 'planet' || nav.level === 'moon') {
      const planet = planets.find(p => p.id === nav.planetId);
      if (planet) {
        const dist = planet.visualRadius * 5 + 2;
        targetPos.current.set(planet.orbitRadius, dist * 0.4, dist);
        targetLook.current.set(planet.orbitRadius, 0, 0);
      }
    }
    // Start a fly-to animation whenever nav changes
    isAnimating.current = true;
    animProgress.current = 0;
  }, [nav, planets]);

  useFrame((_, delta) => {
    if (!isAnimating.current) return;

    // Exponential ease-out lerp
    const lerpSpeed = 1 - Math.pow(0.001, delta);

    camera.position.lerp(targetPos.current, lerpSpeed);
    currentLook.current.lerp(targetLook.current, lerpSpeed);
    camera.lookAt(currentLook.current);

    // Check if we're close enough to stop animating
    animProgress.current += delta;
    const distToTarget = camera.position.distanceTo(targetPos.current);
    if (distToTarget < 0.05 && animProgress.current > 0.5) {
      // Snap to final position and stop — let OrbitControls take over
      if (nav.level === 'system') {
        // Don't snap in system view — let the user's orbit position persist
        isAnimating.current = false;
      } else {
        camera.position.copy(targetPos.current);
        camera.lookAt(targetLook.current);
        isAnimating.current = false;
      }
    }
  });

  return null;
}
