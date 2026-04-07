import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Color, Vector3, SphereGeometry } from 'three';
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

/** Seeded pseudo-random number generator (mulberry32) for deterministic shapes. */
function seededRandom(seed: number) {
  let t = seed + 0x6D2B79F5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string into a number for use as a PRNG seed. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * Create a potato-shaped geometry by displacing sphere vertices with
 * low-frequency seeded noise. Each moon ID produces a unique but
 * deterministic shape.
 */
function createIrregularGeometry(radius: number, moonId: string): SphereGeometry {
  const geo = new SphereGeometry(radius, 24, 24);
  const pos = geo.attributes.position;
  const rand = seededRandom(hashString(moonId));

  // Pick a consistent elongation axis and strength for the whole moon
  const stretchTheta = rand() * Math.PI * 2;
  const stretchPhi = Math.acos(2 * rand() - 1);
  const stretchAxis = {
    x: Math.sin(stretchPhi) * Math.cos(stretchTheta),
    y: Math.sin(stretchPhi) * Math.sin(stretchTheta),
    z: Math.cos(stretchPhi),
  };
  const stretchAmount = 0.2 + rand() * 0.25; // 20-45% elongation

  // Build 3-4 broad lobes for gentle lumps
  const lobeCount = 3 + Math.floor(rand() * 2);
  const lobes: { x: number; y: number; z: number; strength: number; freq: number }[] = [];
  for (let i = 0; i < lobeCount; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    lobes.push({
      x: Math.sin(phi) * Math.cos(theta),
      y: Math.sin(phi) * Math.sin(theta),
      z: Math.cos(phi),
      strength: 0.08 + rand() * 0.14, // 8-22% displacement (gentler)
      freq: 1.2 + rand() * 1.0,       // broad, smooth bumps
    });
  }

  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    const dir = v.clone().normalize();
    let displacement = 0;
    for (const lobe of lobes) {
      const dot = dir.x * lobe.x + dir.y * lobe.y + dir.z * lobe.z;
      displacement += lobe.strength * Math.pow(Math.max(0, dot), lobe.freq);
    }
    // Elongate along the chosen axis
    const axisDot = dir.x * stretchAxis.x + dir.y * stretchAxis.y + dir.z * stretchAxis.z;
    const stretch = 1 + stretchAmount * axisDot * axisDot;
    const scale = (1 - 0.1 + displacement) * stretch;
    pos.setXYZ(i, dir.x * radius * scale, dir.y * radius * scale, dir.z * radius * scale);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

interface MoonOrbitProps {
  moon: Moon;
  onClick?: () => void;
  showLabel?: boolean;
  paused?: boolean;
}

export function MoonOrbit({ moon, onClick, showLabel = true, paused = false }: MoonOrbitProps) {
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

  const irregularGeo = useMemo(
    () => moon.shape === 'irregular' ? createIrregularGeometry(visualRadius, moon.id) : null,
    [moon.shape, moon.id, visualRadius],
  );

  // Orbit speed inversely proportional to orbital period
  const orbitSpeed = moon.orbitalPeriod > 0 ? 0.5 / moon.orbitalPeriod : 0.3;
  const orbitDirection = moon.retrograde ? 1 : -1;

  const worldPos = useRef(new Vector3());

  useFrame((_, delta) => {
    if (!paused) {
      angleRef.current += delta * orbitSpeed * orbitDirection;
    }
    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(angleRef.current) * moon.orbitRadius;
      groupRef.current.position.z = Math.sin(angleRef.current) * moon.orbitRadius;
      // Broadcast world position (includes parent planet's position)
      groupRef.current.getWorldPosition(worldPos.current);
      setMoonPosition(moon.id, worldPos.current.x, worldPos.current.y, worldPos.current.z);
    }
    // Slow tumble for irregular moons
    if (!paused && moon.shape === 'irregular' && moonMeshRef.current) {
      moonMeshRef.current.rotation.x += delta * 0.15;
      moonMeshRef.current.rotation.y += delta * 0.25;
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
          geometry={irregularGeo ?? undefined}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = ''; }}
        >
          {!irregularGeo && <sphereGeometry args={[visualRadius, 24, 24]} />}
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
