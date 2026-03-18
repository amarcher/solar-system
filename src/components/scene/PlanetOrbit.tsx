import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { Planet } from '../../types/celestialBody';
import { PlanetMesh } from './PlanetMesh';
import { setPlanetPosition } from '../../utils/planetPositions';

interface PlanetOrbitProps {
  planet: Planet;
  onClick?: () => void;
  /** If true, pause orbit animation (for reduced-motion or when focused) */
  paused?: boolean;
  showLabel?: boolean;
}

export function PlanetOrbit({ planet, onClick, paused, showLabel = true }: PlanetOrbitProps) {
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
        <PlanetMesh planet={planet} onClick={onClick} showLabel={showLabel} />
      </group>
    </>
  );
}
