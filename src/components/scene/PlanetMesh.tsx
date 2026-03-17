import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { Planet } from '../../types/celestialBody';

interface PlanetMeshProps {
  planet: Planet;
  onClick?: () => void;
}

export function PlanetMesh({ planet, onClick }: PlanetMeshProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      // Spin on axis
      const speed = planet.rotationPeriod !== 0 ? 0.3 / Math.abs(planet.rotationPeriod / 24) : 0.1;
      const direction = planet.rotationPeriod < 0 ? -1 : 1;
      meshRef.current.rotation.y += delta * speed * direction;
    }
  });

  const isGasGiant = planet.category === 'gas-giant' || planet.category === 'ice-giant';

  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        rotation-z={planet.axialTilt * (Math.PI / 180)}
      >
        <sphereGeometry args={[planet.visualRadius, isGasGiant ? 48 : 32, isGasGiant ? 48 : 32]} />
        <meshStandardMaterial
          color={planet.color}
          roughness={isGasGiant ? 0.7 : 0.85}
          metalness={isGasGiant ? 0.0 : 0.1}
        />
      </mesh>

      {/* Atmosphere glow for planets with atmospheres */}
      {planet.atmosphereComposition !== 'None (exosphere only)' && (
        <mesh rotation-z={planet.axialTilt * (Math.PI / 180)}>
          <sphereGeometry args={[planet.visualRadius * 1.08, 32, 32]} />
          <meshBasicMaterial
            color={planet.color}
            transparent
            opacity={0.06}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Rings for Saturn and Uranus */}
      {planet.hasRings && (
        <mesh
          rotation-x={Math.PI / 2}
          rotation-z={planet.axialTilt * (Math.PI / 180)}
        >
          <ringGeometry args={[planet.visualRadius * 1.4, planet.visualRadius * 2.2, 64]} />
          <meshBasicMaterial
            color={planet.id === 'saturn' ? '#d4c5a0' : '#a0c4d4'}
            transparent
            opacity={planet.id === 'saturn' ? 0.5 : 0.2}
            side={2} // DoubleSide
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
