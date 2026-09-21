import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import type { Moon, Planet } from '../../types/celestialBody';
import type { Mission } from '../../types/mission';
import { PlanetMesh } from './PlanetMesh';
import { MoonOrbit } from './MoonOrbit';
import { MissionTrajectory } from './MissionTrajectory';
import { useFocusedSpace } from '../../sceneLayout/useFocusedSpace';
import { applyFocusSpace } from '../../sceneLayout/focusedSpace';
import { HeliocentricOrbit } from '../../sceneLayout/HeliocentricOrbit';
import { setPlanetPosition } from '../../utils/planetPositions';

function startingAngle(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (Math.imul(31, hash) + id.charCodeAt(i)) | 0;
  }
  return ((hash >>> 0) / 4294967296) * Math.PI * 2;
}

interface PlanetOrbitProps {
  planet: Planet;
  moons?: Moon[];
  missions?: Mission[];
  onClick?: () => void;
  onMoonClick?: (moonId: string) => void;
  /** If true, pause orbit animation (for reduced-motion or when focused) */
  paused?: boolean;
  showLabel?: boolean;
  showMoonLabels?: boolean;
  showMoons?: boolean;
  selectedMoonId?: string;
  /** When false the whole orbit group is hidden (but stays mounted so the orbit angle persists). */
  visible?: boolean;
}

export function PlanetOrbit({ planet, moons = [], missions = [], onClick, onMoonClick, paused, showLabel = true, showMoonLabels = true, showMoons = false, selectedMoonId, visible = true }: PlanetOrbitProps) {
  const groupRef = useRef<Group>(null);
  const space = useFocusedSpace();
  const raw = useRef(new Vector3());
  const points = useMemo(() => {
    const values = new Float32Array(128 * 3);
    for (let i = 0; i < 128; i++) { values[i * 3] = Math.cos(i * Math.PI / 64) * planet.orbitRadius; values[i * 3 + 2] = Math.sin(i * Math.PI / 64) * planet.orbitRadius; }
    return values;
  }, [planet.orbitRadius]);
  useEffect(() => () => { space.raw.delete(planet.id); }, [space, planet.id]);
  const angleRef = useRef(startingAngle(planet.id));

  useFrame((_, delta) => {
    if (!paused) {
      // Decreasing angle = counterclockwise from above, matching prograde
      // planet spin and the real solar system viewed from the north.
      angleRef.current -= delta * planet.orbitSpeed;
    }
    raw.current.set(Math.cos(angleRef.current) * planet.orbitRadius, 0, Math.sin(angleRef.current) * planet.orbitRadius);
    space.raw.set(planet.id, raw.current);
  }, -4);
  useFrame(() => {
    if (!groupRef.current) return;
    const position = applyFocusSpace(space, raw.current, groupRef.current.position);
    setPlanetPosition(planet.id, position.x, position.y, position.z);
  }, -3);

  return (
    <group visible={visible}>
      <HeliocentricOrbit id={planet.id} points={points} ringRadius={planet.orbitRadius} />

      {/* Planet group (orbiting) */}
      <group ref={groupRef}>
        <PlanetMesh planet={planet} onClick={onClick} showLabel={showLabel} showMoons={showMoons} paused={paused} />

        {/* Moons orbiting this planet */}
        {showMoons && moons.map((moon) => (
          <MoonOrbit
            key={moon.id}
            moon={moon}
            onClick={() => onMoonClick?.(moon.id)}
            showLabel={showMoonLabels}
            paused={paused}
            selected={moon.id === selectedMoonId}
          />
        ))}

        {/* Missions in flight from this planet */}
        {missions.map((mission) => (
          <MissionTrajectory key={mission.id} mission={mission} />
        ))}
      </group>
    </group>
  );
}
