import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { DoubleSide, RingGeometry } from 'three';
import type { Mesh } from 'three';
import type { Planet } from '../../types/celestialBody';
import { usePlanetTexture, useRingTexture } from '../../utils/textures';
import { Atmosphere } from './Atmosphere';

/** Per-planet atmosphere tuning */
const ATMOSPHERE_CONFIG: Record<string, { color: string; intensity: number; power: number }> = {
  venus:   { color: '#ffe0a0', intensity: 0.9, power: 2.5 },  // thick hazy atmosphere
  earth:   { color: '#6cb4ee', intensity: 0.7, power: 3.0 },  // blue sky
  mars:    { color: '#d4a574', intensity: 0.35, power: 4.0 },  // thin dusty
  jupiter: { color: '#d4b896', intensity: 0.5, power: 3.5 },
  saturn:  { color: '#e8d8b8', intensity: 0.4, power: 3.5 },
  uranus:  { color: '#7de8e8', intensity: 0.5, power: 3.0 },
  neptune: { color: '#5580ee', intensity: 0.6, power: 3.0 },
};

interface PlanetMeshProps {
  planet: Planet;
  onClick?: () => void;
}

export function PlanetMesh({ planet, onClick }: PlanetMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const diffuseMap = usePlanetTexture(planet.id);

  useFrame((_, delta) => {
    if (meshRef.current) {
      const speed = planet.rotationPeriod !== 0 ? 0.3 / Math.abs(planet.rotationPeriod / 24) : 0.1;
      const direction = planet.rotationPeriod < 0 ? -1 : 1;
      meshRef.current.rotation.y += delta * speed * direction;
    }
  });

  const isGasGiant = planet.category === 'gas-giant' || planet.category === 'ice-giant';
  const segments = isGasGiant ? 48 : 32;
  const atmosphere = ATMOSPHERE_CONFIG[planet.id];
  const hasAtmosphere = planet.atmosphereComposition !== 'None (exosphere only)';

  // Generous hit area — small planets get a large minimum so kids can catch them
  const hitRadius = Math.max(planet.visualRadius * 3, 1.0);

  return (
    <group>
      {/* Invisible enlarged hit area for easier clicking/tapping */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}
        visible={false}
      >
        <sphereGeometry args={[hitRadius, 16, 16]} />
        <meshBasicMaterial />
      </mesh>

      {/* Planet sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        rotation-z={planet.axialTilt * (Math.PI / 180)}
      >
        <sphereGeometry args={[planet.visualRadius, segments, segments]} />
        {diffuseMap ? (
          <meshStandardMaterial
            map={diffuseMap}
            roughness={isGasGiant ? 0.7 : 0.85}
            metalness={isGasGiant ? 0.0 : 0.1}
          />
        ) : (
          <meshStandardMaterial
            color={planet.color}
            roughness={isGasGiant ? 0.7 : 0.85}
            metalness={isGasGiant ? 0.0 : 0.1}
          />
        )}
      </mesh>

      {/* Fresnel atmosphere glow */}
      {hasAtmosphere && atmosphere && (
        <group rotation-z={planet.axialTilt * (Math.PI / 180)}>
          <Atmosphere
            radius={planet.visualRadius}
            color={atmosphere.color}
            intensity={atmosphere.intensity}
            power={atmosphere.power}
          />
        </group>
      )}

      {/* Fallback atmosphere for planets without specific config */}
      {hasAtmosphere && !atmosphere && (
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

      {/* Rings */}
      {planet.hasRings && (planet.id === 'saturn' || planet.id === 'uranus') && (
        <ProceduralRings planet={planet} />
      )}

      {/* Rings for other ringed planets (Jupiter, Neptune — very faint) */}
      {planet.hasRings && planet.id !== 'saturn' && planet.id !== 'uranus' && (
        <mesh
          rotation-x={Math.PI / 2}
          rotation-z={planet.axialTilt * (Math.PI / 180)}
        >
          <ringGeometry args={[planet.visualRadius * 1.4, planet.visualRadius * 2.0, 64]} />
          <meshBasicMaterial
            color={planet.color}
            transparent
            opacity={0.05}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Name label */}
      <Html
        position={[0, -(planet.visualRadius + 0.3), 0]}
        center
        style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '11px',
          fontFamily: "'Space Grotesk', sans-serif",
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
          textShadow: '0 1px 6px rgba(0, 0, 0, 0.9)',
          letterSpacing: '0.03em',
        }}
      >
        {planet.name}
      </Html>
    </group>
  );
}

function ProceduralRings({ planet }: { planet: Planet }) {
  const ringTexture = useRingTexture(planet.id as 'saturn' | 'uranus');

  const innerMul = planet.id === 'saturn' ? 1.3 : 1.5;
  const outerMul = planet.id === 'saturn' ? 2.4 : 1.9;
  const innerR = planet.visualRadius * innerMul;
  const outerR = planet.visualRadius * outerMul;

  // Remap UVs so U goes radially from inner→outer edge (for 1D ring texture)
  const geometry = useMemo(() => {
    const geo = new RingGeometry(innerR, outerR, 128, 1);
    const uvs = geo.attributes.uv;
    const pos = geo.attributes.position;
    for (let i = 0; i < uvs.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      // Map distance to 0..1 range (inner→outer)
      uvs.setXY(i, (dist - innerR) / (outerR - innerR), 0.5);
    }
    uvs.needsUpdate = true;
    return geo;
  }, [innerR, outerR]);

  return (
    <mesh
      rotation-x={Math.PI / 2}
      rotation-z={planet.axialTilt * (Math.PI / 180)}
      geometry={geometry}
    >
      <meshBasicMaterial
        map={ringTexture}
        transparent
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
