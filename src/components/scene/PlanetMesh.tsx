import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Color, DoubleSide, RingGeometry } from 'three';
import type { Mesh } from 'three';
import type { Planet } from '../../types/celestialBody';
import { usePlanetTexture, useTexturePath, useRingTexture } from '../../utils/textures';
interface PlanetMeshProps {
  planet: Planet;
  onClick?: () => void;
  showLabel?: boolean;
  /** When true, moons are visible — shrink hit area so moon clicks get through */
  showMoons?: boolean;
  paused?: boolean;
}

export function PlanetMesh({ planet, onClick, showLabel = true, showMoons = false, paused = false }: PlanetMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const cloudRef = useRef<Mesh>(null);
  const diffuseMap = usePlanetTexture(planet.id);
  const cloudMap = useTexturePath(planet.id === 'earth' ? '/textures/2k/earth_clouds.jpg' : '');

  useFrame((_, delta) => {
    if (paused) return;
    if (meshRef.current) {
      const speed = planet.rotationPeriod !== 0 ? 0.3 / Math.abs(planet.rotationPeriod / 24) : 0.1;
      const direction = planet.rotationPeriod < 0 ? -1 : 1;
      meshRef.current.rotation.y += delta * speed * direction;
    }
    // Clouds rotate with the surface plus a slight drift
    if (cloudRef.current) {
      const speed = planet.rotationPeriod !== 0 ? 0.3 / Math.abs(planet.rotationPeriod / 24) : 0.1;
      const direction = planet.rotationPeriod < 0 ? -1 : 1;
      cloudRef.current.rotation.y += delta * speed * direction + delta * 0.008;
    }
  });

  const isGasGiant = planet.category === 'gas-giant' || planet.category === 'ice-giant';
  const segments = isGasGiant ? 48 : 32;

  // When textured, use a near-white color with a subtle planet color cast.
  // Lerp 15% toward planet.color so the texture drives appearance while
  // retaining a hint of the characteristic hue. Full planet.color was
  // crushing texture detail (e.g. Earth's blue killed continent greens).
  const tintColor = useMemo(() => {
    if (diffuseMap) {
      const c = new Color('#ffffff');
      c.lerp(new Color(planet.color), 0.15);
      return c;
    }
    return new Color(planet.color);
  }, [planet.color, diffuseMap]);

  // R3F doesn't always detect map changing from undefined → Texture on re-render.
  // Imperatively apply the texture when it finishes loading.
  useEffect(() => {
    if (meshRef.current?.material && diffuseMap) {
      const mat = meshRef.current.material as any;
      mat.map = diffuseMap;
      mat.needsUpdate = true;
    }
  }, [diffuseMap]);

  // When moons are visible, use the actual planet radius so we don't block moon clicks.
  // In system view, use a generous hit area so small planets are easy to tap.
  const hitRadius = showMoons
    ? planet.visualRadius
    : Math.max(planet.visualRadius * 3, 1.0);

  const axialTiltRad = planet.axialTilt * (Math.PI / 180);

  return (
    <group>
      {/* Invisible enlarged hit area for easier clicking/tapping */}
      {!showMoons && (
        <mesh
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = ''; }}
          visible={false}
        >
          <sphereGeometry args={[hitRadius, 16, 16]} />
          <meshBasicMaterial />
        </mesh>
      )}

      {/* Axial tilt group — everything inside spins around the tilted local Y axis */}
      <group rotation-z={axialTiltRad}>
        {/* Planet sphere */}
        <mesh
          ref={meshRef}
          castShadow
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        >
          <sphereGeometry args={[planet.visualRadius, segments, segments]} />
          <meshStandardMaterial
            map={diffuseMap ?? undefined}
            color={tintColor}
            roughness={0.7}
            metalness={0}
          />
        </mesh>

        {/* Earth cloud layer — slightly larger sphere rotating independently */}
        {planet.id === 'earth' && cloudMap && (
          <mesh ref={cloudRef}>
            <sphereGeometry args={[planet.visualRadius * 1.015, segments, segments]} />
            <meshStandardMaterial
              map={cloudMap}
              transparent
              opacity={0.25}
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
          <mesh rotation-x={Math.PI / 2}>
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
      </group>

      {/* Name label — outside tilt group so it stays upright */}
      {showLabel && (
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
      )}
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
      receiveShadow
      rotation-x={Math.PI / 2}
      geometry={geometry}
    >
      <meshStandardMaterial
        map={ringTexture}
        transparent
        side={DoubleSide}
        depthWrite={false}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}
