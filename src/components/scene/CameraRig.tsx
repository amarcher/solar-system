import { useRef, useEffect } from 'react';
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
  const isAnimating = useRef(false);
  const animProgress = useRef(1);

  const trackingPlanetId = useRef<string | null>(null);
  const trackingMoonId = useRef<string | null>(null);

  // Store the user's orbit offset so we can preserve it while tracking
  const orbitOffset = useRef(new THREE.Vector3());
  const settled = useRef(false);

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
    settled.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- planets is a stable list; only react to nav changes
  }, [nav]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const isTracking = !!(trackingPlanetId.current || trackingMoonId.current);

    // Compute the current target center (the object we're focused on)
    if (trackingMoonId.current) {
      const moonPos = getMoonPosition(trackingMoonId.current);
      const moon = getMoonById(trackingMoonId.current);
      if (moonPos && moon) {
        targetLook.current.copy(moonPos);
        if (!settled.current) {
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
        if (!settled.current) {
          const dist = planet.visualRadius * 5 + 2;
          targetPos.current.set(
            pos.x,
            pos.y + dist * 0.4,
            pos.z + dist,
          );
        }
      }
    }

    if (isAnimating.current) {
      // Fly-in: lerp camera and controls target to destination
      const lerpSpeed = 1 - Math.pow(0.001, delta);

      camera.position.lerp(targetPos.current, lerpSpeed);
      controls.target.lerp(targetLook.current, lerpSpeed);
      controls.update();

      animProgress.current += delta;
      const distToTarget = camera.position.distanceTo(targetPos.current);
      if (distToTarget < 0.05 && animProgress.current > 0.5) {
        isAnimating.current = false;
        settled.current = true;
        // Snapshot the offset so OrbitControls preserves the user's view angle
        orbitOffset.current.copy(camera.position).sub(controls.target);
      }
    } else if (isTracking && settled.current) {
      // After fly-in: keep the controls target following the orbiting body,
      // but let OrbitControls handle the camera position (user can drag)
      const lerpSpeed = 1 - Math.pow(0.0001, delta);
      controls.target.lerp(targetLook.current, lerpSpeed);
      controls.update();
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
