import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import type { Moon, Planet } from '../../types/celestialBody';
import { PlanetMesh } from './PlanetMesh';
import { RealisticMoonOrbit } from './RealisticMoonOrbit';
import { setPlanetPosition } from '../../utils/planetPositions';
import { useAstronomy } from '../../astronomy/useAstronomy';
import * as AstronomyService from '../../astronomy/AstronomyService';
import { useFocusedSpace } from '../../sceneLayout/useFocusedSpace';
import { applyFocusSpace } from '../../sceneLayout/focusedSpace';
import { scaleAUVector } from '../../astronomy/realisticScale';

interface RealisticPlanetProps {
  planet: Planet;
  moons?: Moon[];
  onClick?: () => void;
  onMoonClick?: (moonId: string) => void;
  showLabel?: boolean;
  showMoons?: boolean;
  showMoonLabels?: boolean;
  selectedMoonId?: string;
}

/** Minimum recompute interval in ms of simulation time. */
const RECOMPUTE_THRESHOLD_MS = 1000;

export function RealisticPlanet({ planet, moons = [], onClick, onMoonClick, showLabel = true, showMoons = false, showMoonLabels = true, selectedMoonId }: RealisticPlanetProps) {
  const groupRef = useRef<Group>(null);
  const { timeRef, engineReady, rate } = useAstronomy();
  const lastComputedTime = useRef(0);
  const cachedPos = useRef(new Vector3());
  const space = useFocusedSpace();
  useEffect(() => () => { space.raw.delete(planet.id); }, [space, planet.id]);

  useFrame(() => {
    if (!groupRef.current || !engineReady) return;

    const now = timeRef.current;
    // Only recompute when sim time has changed enough
    if (Math.abs(now - lastComputedTime.current) > RECOMPUTE_THRESHOLD_MS) {
      lastComputedTime.current = now;
      try {
        const helio = AstronomyService.getHeliocentricPosition(planet.id, new Date(now));
        const scenePos = scaleAUVector(
          helio.x,
          helio.z, // ecliptic z → scene y (for slight elevation)
          -helio.y, // ecliptic y → scene -z (top-down view: x-right, z-toward camera)
        );
        cachedPos.current.x = scenePos.x;
        cachedPos.current.y = scenePos.y;
        cachedPos.current.z = scenePos.z;
      } catch {
        // Body not supported (e.g. Ceres) — use artistic fallback position
      }
    }

    space.raw.set(planet.id, cachedPos.current);
  }, -4);
  useFrame(() => {
    if (!groupRef.current || !engineReady) return;
    const position = applyFocusSpace(space, cachedPos.current, groupRef.current.position);
    setPlanetPosition(planet.id, position.x, position.y, position.z);
  }, -3);

  return (
    <group ref={groupRef}>
      <PlanetMesh
        planet={planet}
        onClick={onClick}
        showLabel={showLabel}
        showMoons={showMoons}
        paused={rate === 0}
        timeScale={rate}
        useRealRotation
        timeRef={timeRef}
      />

      {showMoons && moons.map((moon) => (
        <RealisticMoonOrbit
          key={moon.id}
          moon={moon}
          onClick={() => onMoonClick?.(moon.id)}
          showLabel={showMoonLabels}
          selected={moon.id === selectedMoonId}
        />
      ))}
    </group>
  );
}
