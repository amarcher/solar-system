import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
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
  const targetPos = useRef(SYSTEM_POSITION.clone());
  const targetLook = useRef(SYSTEM_TARGET.clone());
  const currentLook = useRef(SYSTEM_TARGET.clone());
  const isAnimating = useRef(false);
  const animProgress = useRef(1);

  const trackingPlanetId = useRef<string | null>(null);
  const trackingMoonId = useRef<string | null>(null);

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
    isAnimating.current = true;
    animProgress.current = 0;
  }, [nav, planets]);

  useFrame((_, delta) => {
    // Track moon if at moon level
    if (trackingMoonId.current) {
      const moonPos = getMoonPosition(trackingMoonId.current);
      const moon = getMoonById(trackingMoonId.current);
      if (moonPos && moon) {
        const moonRadius = Math.max(moon.diameter / 8000, 0.06);
        const dist = moonRadius * 8 + 0.5;
        targetPos.current.set(
          moonPos.x,
          moonPos.y + dist * 0.3,
          moonPos.z + dist,
        );
        targetLook.current.copy(moonPos);
      }
    } else if (trackingPlanetId.current) {
      // Track planet
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

    const isTracking = trackingPlanetId.current || trackingMoonId.current;
    if (!isAnimating.current && !isTracking) return;

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
      } else if (!isTracking) {
        camera.position.copy(targetPos.current);
        camera.lookAt(targetLook.current);
        isAnimating.current = false;
      }
    }
  });

  return null;
}
