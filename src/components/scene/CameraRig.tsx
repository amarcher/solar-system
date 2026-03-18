import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { NavigationState, Planet } from '../../types/celestialBody';
import { getPlanetPosition } from '../../utils/planetPositions';

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
  const animProgress = useRef(1);

  // Track which planet we're following (null = none)
  const trackingPlanetId = useRef<string | null>(null);

  useEffect(() => {
    if (nav.level === 'system') {
      targetPos.current.copy(SYSTEM_POSITION);
      targetLook.current.copy(SYSTEM_TARGET);
      trackingPlanetId.current = null;
    } else if (nav.level === 'sun') {
      targetPos.current.set(0, 2, 6);
      targetLook.current.set(0, 0, 0);
      trackingPlanetId.current = null;
    } else if (nav.level === 'planet' || nav.level === 'moon') {
      trackingPlanetId.current = nav.planetId;
      // Initial target will be updated in useFrame from live position
    }
    isAnimating.current = true;
    animProgress.current = 0;
  }, [nav, planets]);

  useFrame((_, delta) => {
    // If tracking a planet, continuously update targets from live position
    if (trackingPlanetId.current) {
      const planet = planets.find(p => p.id === trackingPlanetId.current);
      const pos = getPlanetPosition(trackingPlanetId.current);
      if (planet && pos) {
        const dist = planet.visualRadius * 5 + 2;
        targetPos.current.set(
          pos.x,
          pos.y + dist * 0.4,
          pos.z + dist,
        );
        targetLook.current.copy(pos);
      }
    }

    if (!isAnimating.current && !trackingPlanetId.current) return;

    const lerpSpeed = 1 - Math.pow(0.001, delta);

    camera.position.lerp(targetPos.current, lerpSpeed);
    currentLook.current.lerp(targetLook.current, lerpSpeed);
    camera.lookAt(currentLook.current);

    // Check if initial fly-in is done
    animProgress.current += delta;
    const distToTarget = camera.position.distanceTo(targetPos.current);
    if (distToTarget < 0.05 && animProgress.current > 0.5) {
      if (nav.level === 'system') {
        isAnimating.current = false;
      } else if (!trackingPlanetId.current) {
        camera.position.copy(targetPos.current);
        camera.lookAt(targetLook.current);
        isAnimating.current = false;
      }
      // If tracking, never stop — keep following
    }
  });

  return null;
}
