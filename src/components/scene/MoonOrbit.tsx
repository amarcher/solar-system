import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3 } from 'three';
import type { Group } from 'three';
import type { Moon } from '../../types/celestialBody';
import { usePlanetTexture } from '../../utils/textures';
import { setMoonPosition } from '../../utils/planetPositions';

interface MoonOrbitProps {
  moon: Moon;
  onClick?: () => void;
  showLabel?: boolean;
}

export function MoonOrbit({ moon, onClick, showLabel = true }: MoonOrbitProps) {
  const groupRef = useRef<Group>(null);
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const diffuseMap = usePlanetTexture(moon.id);

  // Derive a visual radius from real diameter, clamped for visibility
  const visualRadius = Math.max(moon.diameter / 8000, 0.06);

  // Orbit speed inversely proportional to orbital period
  const orbitSpeed = moon.orbitalPeriod > 0 ? 0.5 / moon.orbitalPeriod : 0.3;

  const worldPos = useRef(new Vector3());

  useFrame((_, delta) => {
    angleRef.current += delta * orbitSpeed;
    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(angleRef.current) * moon.orbitRadius;
      groupRef.current.position.z = Math.sin(angleRef.current) * moon.orbitRadius;
      // Broadcast world position (includes parent planet's position)
      groupRef.current.getWorldPosition(worldPos.current);
      setMoonPosition(moon.id, worldPos.current.x, worldPos.current.y, worldPos.current.z);
    }
  });

  return (
    <>
      {/* Orbit ring */}
      <mesh rotation-x={Math.PI / 2}>
        <ringGeometry args={[moon.orbitRadius - 0.01, moon.orbitRadius + 0.01, 64]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.04}
          depthWrite={false}
        />
      </mesh>

      <group ref={groupRef}>
        <mesh
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = ''; }}
        >
          <sphereGeometry args={[visualRadius, 24, 24]} />
          {diffuseMap ? (
            <meshStandardMaterial map={diffuseMap} roughness={0.9} metalness={0} />
          ) : (
            <meshStandardMaterial color="#aaaaaa" roughness={0.9} metalness={0} />
          )}
        </mesh>

        {/* Enlarged invisible hit area */}
        <mesh
          visible={false}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = ''; }}
        >
          <sphereGeometry args={[Math.max(visualRadius * 3, 0.3), 16, 16]} />
          <meshBasicMaterial />
        </mesh>

        {showLabel && (
          <Html
            position={[0, -(visualRadius + 0.15), 0]}
            center
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '9px',
              fontFamily: "'Space Grotesk', sans-serif",
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              userSelect: 'none',
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.9)',
              letterSpacing: '0.03em',
            }}
          >
            {moon.name}
          </Html>
        )}
      </group>
    </>
  );
}
