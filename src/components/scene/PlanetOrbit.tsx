import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { Moon, Planet } from '../../types/celestialBody';
import type { Mission } from '../../types/mission';
import { PlanetMesh } from './PlanetMesh';
import { MoonOrbit } from './MoonOrbit';
import { MissionTrajectory } from './MissionTrajectory';
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
  const angleRef = useRef(startingAngle(planet.id));

  useFrame((_, delta) => {
    if (!paused) {
      // Decreasing angle = counterclockwise from above, matching prograde
      // planet spin and the real solar system viewed from the north.
      angleRef.current -= delta * planet.orbitSpeed;
    }
    if (groupRef.current) {
      const x = Math.cos(angleRef.current) * planet.orbitRadius;
      const z = Math.sin(angleRef.current) * planet.orbitRadius;
      groupRef.current.position.x = x;
      groupRef.current.position.z = z;
      setPlanetPosition(planet.id, x, 0, z);
    }
  });

  return (
    <group visible={visible}>
      {/* Orbit ring */}
      <mesh rotation-x={Math.PI / 2}>
        <ringGeometry args={[planet.orbitRadius - 0.02, planet.orbitRadius + 0.02, 128]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>

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
