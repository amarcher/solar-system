import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { Mesh, Group } from 'three';
import type { Planet, Moon } from '../../types/celestialBody';
import { getMoonsByPlanet } from '../../data/moons';
import { usePlanetTexture, useTexturePath, useRingTexture } from '../../utils/textures';
import { DoubleSide, RingGeometry } from 'three';

/* ── Mini planet (spinning at center) ─────────────────────────────── */

function MiniPlanet({ planet, radius }: { planet: Planet; radius: number }) {
  const meshRef = useRef<Mesh>(null);
  const diffuseMap = usePlanetTexture(planet.id);
  const isGasGiant = planet.category === 'gas-giant' || planet.category === 'ice-giant';
  const segments = isGasGiant ? 48 : 32;

  const rotSpeed = useMemo(() => {
    const s = planet.rotationPeriod !== 0 ? 0.3 / Math.abs(planet.rotationPeriod / 24) : 0.1;
    return planet.rotationPeriod < 0 ? -s : s;
  }, [planet.rotationPeriod]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * rotSpeed;
    }
  });

  return (
    <group rotation-z={planet.axialTilt * (Math.PI / 180)}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, segments, segments]} />
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


      {planet.hasRings && (planet.id === 'saturn' || planet.id === 'uranus') && (
        <MiniRings planetId={planet.id} planetRadius={radius} />
      )}
    </group>
  );
}

/* ── Mini rings (reuse procedural texture) ────────────────────────── */

function MiniRings({ planetId, planetRadius }: { planetId: 'saturn' | 'uranus'; planetRadius: number }) {
  const ringTexture = useRingTexture(planetId);
  const innerMul = planetId === 'saturn' ? 1.3 : 1.5;
  const outerMul = planetId === 'saturn' ? 2.4 : 1.9;
  const innerR = planetRadius * innerMul;
  const outerR = planetRadius * outerMul;

  const geometry = useMemo(() => {
    const geo = new RingGeometry(innerR, outerR, 128, 1);
    const uvs = geo.attributes.uv;
    const pos = geo.attributes.position;
    for (let i = 0; i < uvs.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      uvs.setXY(i, (dist - innerR) / (outerR - innerR), 0.5);
    }
    uvs.needsUpdate = true;
    return geo;
  }, [innerR, outerR]);

  return (
    <mesh rotation-x={Math.PI / 2} geometry={geometry}>
      <meshBasicMaterial
        map={ringTexture}
        transparent
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── Orbiting moon ────────────────────────────────────────────────── */

const MOON_TEXTURE_PATH: Record<string, string> = {
  moon: '/textures/2k/moon_diffuse.jpg',
  io: '/textures/2k/io_diffuse.jpg',
  europa: '/textures/2k/europa_diffuse.jpg',
  ganymede: '/textures/2k/ganymede_diffuse.jpg',
  callisto: '/textures/2k/callisto_diffuse.jpg',
  titan: '/textures/2k/titan_diffuse.jpg',
  enceladus: '/textures/2k/enceladus_diffuse.jpg',
  mimas: '/textures/2k/mimas_diffuse.jpg',
  triton: '/textures/2k/triton_diffuse.jpg',
  charon: '/textures/2k/charon_diffuse.jpg',
};

function OrbitingMoon({
  moon,
  fastestPeriod,
  onClick,
}: {
  moon: Moon;
  fastestPeriod: number;
  onClick: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const texturePath = MOON_TEXTURE_PATH[moon.id] ?? '';
  const diffuseMap = useTexturePath(texturePath);

  // Speed: fastest moon does one orbit in ~8s screen time; others proportionally slower
  const speed = useMemo(() => {
    return (fastestPeriod / moon.orbitalPeriod) * (Math.PI * 2 / 8);
  }, [moon.orbitalPeriod, fastestPeriod]);

  // Moon visual size scales with diameter, clamped for clickability
  const moonRadius = useMemo(() => {
    return Math.max(0.08, Math.min(0.25, Math.log10(Math.max(moon.diameter, 10) / 100) * 0.15 + 0.1));
  }, [moon.diameter]);

  useFrame((_, delta) => {
    angleRef.current += delta * speed;
    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(angleRef.current) * moon.orbitRadius;
      groupRef.current.position.z = Math.sin(angleRef.current) * moon.orbitRadius;
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
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      <group ref={groupRef}>
        {/* Invisible enlarged hit area for easier clicking/tapping */}
        <mesh
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = ''; }}
          visible={false}
        >
          <sphereGeometry args={[Math.max(moonRadius * 3, 0.35), 8, 8]} />
          <meshBasicMaterial />
        </mesh>

        {/* Visible moon sphere */}
        <mesh onClick={(e) => { e.stopPropagation(); onClick(); }}>
          <sphereGeometry args={[moonRadius, 16, 16]} />
          {diffuseMap ? (
            <meshStandardMaterial map={diffuseMap} roughness={0.9} />
          ) : (
            <meshStandardMaterial color="#b8b8c8" roughness={0.9} />
          )}
        </mesh>

        {/* Name label */}
        <Html
          position={[0, moonRadius + 0.15, 0]}
          center
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '10px',
            fontFamily: "'Space Grotesk', sans-serif",
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}
        >
          {moon.name}
        </Html>
      </group>
    </>
  );
}

/* ── Scene content (inside Canvas) ────────────────────────────────── */

function MiniSceneContent({
  planet,
  moons,
  onMoonClick,
}: {
  planet: Planet;
  moons: Moon[];
  onMoonClick: (moonId: string) => void;
}) {
  // Planet radius normalized to ~1.0 in mini scene
  const planetRadius = 1.0;

  // Fastest orbiting moon sets the timescale
  const fastestPeriod = useMemo(
    () => Math.min(...moons.map((m) => m.orbitalPeriod), Infinity),
    [moons],
  );

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />

      <MiniPlanet planet={planet} radius={planetRadius} />

      {moons.map((moon) => (
        <OrbitingMoon
          key={moon.id}
          moon={moon}
          fastestPeriod={fastestPeriod}
          onClick={() => onMoonClick(moon.id)}
        />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={2.5}
        maxDistance={10}
        enableDamping
        dampingFactor={0.1}
      />
    </>
  );
}

/* ── Exported component ───────────────────────────────────────────── */

interface PlanetMiniSceneProps {
  planet: Planet;
  onMoonClick: (moonId: string) => void;
}

export function PlanetMiniScene({ planet, onMoonClick }: PlanetMiniSceneProps) {
  const moons = useMemo(() => getMoonsByPlanet(planet.id), [planet.id]);

  // Camera distance adapts: further out if many moons with large orbits
  const maxOrbit = useMemo(
    () => Math.max(...moons.map((m) => m.orbitRadius), 2),
    [moons],
  );
  const camZ = Math.max(4, maxOrbit * 1.6);

  return (
    <div className="detail__mini-scene" aria-hidden="true">
      <Canvas
        camera={{ position: [0, camZ * 0.5, camZ], fov: 45, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <MiniSceneContent
          planet={planet}
          moons={moons}
          onMoonClick={onMoonClick}
        />
      </Canvas>

      {moons.length > 0 && (
        <div className="detail__mini-hint">Click a moon to explore it</div>
      )}
    </div>
  );
}
