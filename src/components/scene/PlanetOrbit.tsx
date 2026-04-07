import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { Moon, Planet } from '../../types/celestialBody';
import type { Mission } from '../../types/mission';
import { PlanetMesh } from './PlanetMesh';
import { MoonOrbit } from './MoonOrbit';
import { MissionTrajectory } from './MissionTrajectory';
import { setPlanetPosition } from '../../utils/planetPositions';

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
}

export function PlanetOrbit({ planet, moons = [], missions = [], onClick, onMoonClick, paused, showLabel = true, showMoonLabels = true, showMoons = false }: PlanetOrbitProps) {
  const groupRef = useRef<Group>(null);
  const angleRef = useRef(Math.random() * Math.PI * 2); // Random starting position

  useFrame((_, delta) => {
    if (!paused) {
      angleRef.current += delta * planet.orbitSpeed;
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
    <>
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
          />
        ))}

        {/* Missions in flight from this planet */}
        {missions.map((mission) => (
          <MissionTrajectory key={mission.id} mission={mission} />
        ))}
      </group>
    </>
  );
}
