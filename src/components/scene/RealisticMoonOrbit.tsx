import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Color, Vector3, SphereGeometry, type Group, type Mesh } from 'three';
import type { Moon } from '../../types/celestialBody';
import { useAstronomy } from '../../astronomy/AstronomyContext';
import { usePlanetTexture } from '../../utils/textures';
import { setMoonPosition } from '../../utils/planetPositions';

const TWO_PI = Math.PI * 2;

// Same fallback colors as MoonOrbit.tsx
const MOON_COLORS: Record<string, string> = {
  moon: '#c8c8c0',
  phobos: '#8a7d6b', deimos: '#9e9282',
  io: '#d4b84a', europa: '#c4b699', ganymede: '#8a8478', callisto: '#5a5650', amalthea: '#b84030',
  titan: '#d4a850', enceladus: '#f0f0f0', mimas: '#d0d0d0', rhea: '#b8b4a8',
  dione: '#e0dcd0', tethys: '#e8e4d8', iapetus: '#6a4a30', hyperion: '#a89880',
  titania: '#a8b0b8', oberon: '#8a7e72', miranda: '#b0b8c0', ariel: '#c8d0d8', umbriel: '#606058',
  triton: '#c0b8a8', proteus: '#585858', nereid: '#787878',
  charon: '#9a9088', nix: '#e0dcd8', hydra: '#d8d4d0',
};

function seededRandom(seed: number) {
  let t = seed + 0x6D2B79F5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function createIrregularGeometry(radius: number, moonId: string): SphereGeometry {
  const geo = new SphereGeometry(radius, 24, 24);
  const pos = geo.attributes.position;
  const rand = seededRandom(hashString(moonId));
  const stretchTheta = rand() * Math.PI * 2;
  const stretchPhi = Math.acos(2 * rand() - 1);
  const stretchAxis = {
    x: Math.sin(stretchPhi) * Math.cos(stretchTheta),
    y: Math.sin(stretchPhi) * Math.sin(stretchTheta),
    z: Math.cos(stretchPhi),
  };
  const stretchAmount = 0.2 + rand() * 0.25;
  const lobeCount = 3 + Math.floor(rand() * 2);
  const lobes: { x: number; y: number; z: number; strength: number; freq: number }[] = [];
  for (let i = 0; i < lobeCount; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    lobes.push({
      x: Math.sin(phi) * Math.cos(theta),
      y: Math.sin(phi) * Math.sin(theta),
      z: Math.cos(phi),
      strength: 0.08 + rand() * 0.14,
      freq: 1.2 + rand() * 1.0,
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
    const axisDot = dir.x * stretchAxis.x + dir.y * stretchAxis.y + dir.z * stretchAxis.z;
    const stretch = 1 + stretchAmount * axisDot * axisDot;
    const scale = (1 - 0.1 + displacement) * stretch;
    pos.setXYZ(i, dir.x * radius * scale, dir.y * radius * scale, dir.z * radius * scale);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

interface RealisticMoonOrbitProps {
  moon: Moon;
  showLabel?: boolean;
  onClick?: () => void;
}

export function RealisticMoonOrbit({ moon, showLabel = true, onClick }: RealisticMoonOrbitProps) {
  const groupRef = useRef<Group>(null);
  const moonMeshRef = useRef<Mesh>(null);
  const worldPos = useRef(new Vector3());
  const { timeRef, rate } = useAstronomy();

  const radius = moon.orbitRadius;
  const visualRadius = Math.max(moon.diameter / 25000, 0.04);
  const retrograde = moon.retrograde ? -1 : 1;

  const diffuseMap = usePlanetTexture(moon.id);
  const moonColor = MOON_COLORS[moon.id] || '#aaaaaa';

  const tintColor = useMemo(() => {
    if (diffuseMap) {
      const c = new Color('#ffffff');
      c.lerp(new Color(moonColor), 0.2);
      return c;
    }
    return new Color(moonColor);
  }, [moonColor, diffuseMap]);

  useEffect(() => {
    if (moonMeshRef.current?.material && diffuseMap) {
      const mat = moonMeshRef.current.material as any;
      mat.map = diffuseMap;
      mat.needsUpdate = true;
    }
  }, [diffuseMap]);

  const irregularGeo = useMemo(
    () => moon.shape === 'irregular' ? createIrregularGeometry(visualRadius, moon.id) : null,
    [moon.shape, moon.id, visualRadius],
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Compute orbital position from simulation time
    const simTime = timeRef.current;
    const j2000Ms = 946728000000;
    const elapsedDays = (simTime - j2000Ms) / 86_400_000;
    const orbitsCompleted = elapsedDays / moon.orbitalPeriod;
    const angle = (orbitsCompleted * TWO_PI * retrograde) % TWO_PI;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    groupRef.current.position.set(x, 0, z);

    groupRef.current.getWorldPosition(worldPos.current);
    setMoonPosition(moon.id, worldPos.current.x, worldPos.current.y, worldPos.current.z);

    // Self-rotation — log-compressed time scale so it speeds up gently
    if (moonMeshRef.current && rate !== 0) {
      const rotScale = rate <= 1 ? rate : Math.log10(rate + 1);
      const scaledDelta = delta * rotScale;
      if (moon.chaoticRotation) {
        const seed = hashString(moon.id);
        const r1 = 0.2 + (seed % 100) / 500;
        const r2 = 0.15 + ((seed >> 8) % 100) / 400;
        const r3 = 0.1 + ((seed >> 16) % 100) / 600;
        moonMeshRef.current.rotation.x += scaledDelta * r1;
        moonMeshRef.current.rotation.y += scaledDelta * r2;
        moonMeshRef.current.rotation.z += scaledDelta * r3;
      } else {
        const periodHours = moon.rotationPeriod ?? (moon.orbitalPeriod * 24);
        const speed = periodHours !== 0 ? 0.3 / Math.abs(periodHours / 24) : 0.1;
        const direction =
          (moon.rotationPeriod !== undefined && moon.rotationPeriod < 0)
            ? -1 : (moon.retrograde ? -1 : 1);
        moonMeshRef.current.rotation.y += scaledDelta * speed * direction;
      }
    }
  });

  return (
    <>
      {/* Orbit ring */}
      <mesh rotation-x={Math.PI / 2}>
        <ringGeometry args={[radius - 0.01, radius + 0.01, 64]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.06}
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
