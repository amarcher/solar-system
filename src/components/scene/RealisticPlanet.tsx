import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { Moon, Planet } from '../../types/celestialBody';
import { PlanetMesh } from './PlanetMesh';
import { RealisticMoonOrbit } from './RealisticMoonOrbit';
import { setPlanetPosition } from '../../utils/planetPositions';
import { useAstronomy } from '../../astronomy/AstronomyContext';
import * as AstronomyService from '../../astronomy/AstronomyService';
import { scaleAU } from '../../astronomy/realisticScale';

interface RealisticPlanetProps {
  planet: Planet;
  moons?: Moon[];
  onClick?: () => void;
  onMoonClick?: (moonId: string) => void;
  showLabel?: boolean;
  showMoons?: boolean;
  showMoonLabels?: boolean;
}

/** Minimum recompute interval in ms of simulation time. */
const RECOMPUTE_THRESHOLD_MS = 1000;

export function RealisticPlanet({ planet, moons = [], onClick, onMoonClick, showLabel = true, showMoons = false, showMoonLabels = true }: RealisticPlanetProps) {
  const groupRef = useRef<Group>(null);
  const { timeRef, engineReady, rate } = useAstronomy();
  const lastComputedTime = useRef(0);
  const cachedPos = useRef({ x: 0, y: 0, z: 0 });

  useFrame(() => {
    if (!groupRef.current || !engineReady) return;

    const now = timeRef.current;
    // Only recompute when sim time has changed enough
    if (Math.abs(now - lastComputedTime.current) > RECOMPUTE_THRESHOLD_MS) {
      lastComputedTime.current = now;
      try {
        const helio = AstronomyService.getHeliocentricPosition(planet.id, new Date(now));
        cachedPos.current.x = scaleAU(helio.x);
        cachedPos.current.y = scaleAU(helio.z); // ecliptic z → scene y (for slight elevation)
        cachedPos.current.z = scaleAU(-helio.y); // ecliptic y → scene -z (top-down view: x-right, z-toward camera)
      } catch {
        // Body not supported (e.g. Ceres) — use artistic fallback position
      }
    }

    groupRef.current.position.set(
      cachedPos.current.x,
      cachedPos.current.y,
      cachedPos.current.z,
    );
    setPlanetPosition(planet.id, cachedPos.current.x, cachedPos.current.y, cachedPos.current.z);
  });

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
        />
      ))}
    </group>
  );
}
