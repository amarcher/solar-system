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
        // We'll position camera near the planet's orbit radius
        // The actual planet position changes per frame, so we target the orbit
        const dist = planet.visualRadius * 5 + 2;
        targetPos.current.set(planet.orbitRadius, dist * 0.4, dist);
        targetLook.current.set(planet.orbitRadius, 0, 0);
      }
    }
  }, [nav, planets]);

  useFrame((_, delta) => {
    // Exponential ease-out lerp
    const lerpSpeed = 1 - Math.pow(0.001, delta);

    camera.position.lerp(targetPos.current, lerpSpeed);
    currentLook.current.lerp(targetLook.current, lerpSpeed);
    camera.lookAt(currentLook.current);
  });

  return null;
}
