import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Color, Vector3 } from 'three';
import type { Group, Mesh } from 'three';
import type { Moon } from '../../types/celestialBody';
import { usePlanetTexture } from '../../utils/textures';
import { setMoonPosition } from '../../utils/planetPositions';

// Fallback colors for moons without textures, based on real surface appearance
const MOON_COLORS: Record<string, string> = {
  // Earth
  moon: '#c8c8c0',
  // Mars
  phobos: '#8a7d6b', deimos: '#9e9282',
  // Jupiter
  io: '#d4b84a', europa: '#c4b699', ganymede: '#8a8478', callisto: '#5a5650', amalthea: '#b84030',
  // Saturn
  titan: '#d4a850', enceladus: '#f0f0f0', mimas: '#d0d0d0', rhea: '#b8b4a8',
  dione: '#e0dcd0', tethys: '#e8e4d8', iapetus: '#6a4a30', hyperion: '#a89880',
  // Uranus
  titania: '#a8b0b8', oberon: '#8a7e72', miranda: '#b0b8c0', ariel: '#c8d0d8', umbriel: '#606058',
  // Neptune
  triton: '#c0b8a8', proteus: '#585858', nereid: '#787878',
  // Pluto
  charon: '#9a9088', nix: '#e0dcd8', hydra: '#d8d4d0',
};

interface MoonOrbitProps {
  moon: Moon;
  onClick?: () => void;
  showLabel?: boolean;
}

export function MoonOrbit({ moon, onClick, showLabel = true }: MoonOrbitProps) {
  const groupRef = useRef<Group>(null);
  const moonMeshRef = useRef<Mesh>(null);
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const diffuseMap = usePlanetTexture(moon.id);
  const moonColor = MOON_COLORS[moon.id] || '#aaaaaa';

  // When textured, use a near-white color with a subtle moon color cast.
  const tintColor = useMemo(() => {
    if (diffuseMap) {
      const c = new Color('#ffffff');
      c.lerp(new Color(moonColor), 0.2);
      return c;
    }
    return new Color(moonColor);
  }, [moonColor, diffuseMap]);

  // R3F doesn't always detect map changing from undefined → Texture on re-render.
  useEffect(() => {
    if (moonMeshRef.current?.material && diffuseMap) {
      const mat = moonMeshRef.current.material as any;
      mat.map = diffuseMap;
      mat.needsUpdate = true;
    }
  }, [diffuseMap]);

  // Derive a visual radius from real diameter, clamped for visibility.
  // Divisor of 25000 keeps moons visually smaller than their parent planet
  // while still large enough to see and click.
  const visualRadius = Math.max(moon.diameter / 25000, 0.04);

  // Orbit speed inversely proportional to orbital period
  const orbitSpeed = moon.orbitalPeriod > 0 ? 0.5 / moon.orbitalPeriod : 0.3;
  const orbitDirection = moon.retrograde ? -1 : 1;

  const worldPos = useRef(new Vector3());

  useFrame((_, delta) => {
    angleRef.current += delta * orbitSpeed * orbitDirection;
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
          ref={moonMeshRef}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = ''; }}
        >
          <sphereGeometry args={[visualRadius, 24, 24]} />
          <meshStandardMaterial
            map={diffuseMap ?? undefined}
            color={tintColor}
            roughness={0.75}
            metalness={0}
          />
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
