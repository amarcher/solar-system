import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Mesh } from 'three';
import type { Moon } from '../../types/celestialBody';
import { useTexturePath } from '../../utils/textures';

// Map moon IDs to texture files
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

function SpinningMoon({ moon }: { moon: Moon }) {
  const meshRef = useRef<Mesh>(null);
  const texturePath = MOON_TEXTURE_PATH[moon.id] ?? '';
  const diffuseMap = useTexturePath(texturePath);

  const speed = useMemo(() => {
    return (Math.PI * 2) / 6;
  }, []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * speed;
    }
  });

  const radius = useMemo(() => {
    return Math.max(0.6, Math.min(1.2, Math.log10(Math.max(moon.diameter, 10) / 100) * 0.5 + 0.8));
  }, [moon.diameter]);

  // Fallback color when no texture is available
  const color = useMemo(() => {
    const id = moon.id;
    if (id === 'io') return '#c8b040';
    if (id === 'europa') return '#d4d0c8';
    if (id === 'titan') return '#c4a060';
    if (id === 'enceladus') return '#e8e8f0';
    if (id === 'triton') return '#b0c8d0';
    if (id === 'moon') return '#b8b4a8';
    if (id === 'charon') return '#a89888';
    if (id === 'ganymede') return '#b8b0a0';
    if (id === 'callisto') return '#888078';
    if (id === 'iapetus') return '#a09080';
    return '#b0b0b0';
  }, [moon.id]);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, 32, 32]} />
      {diffuseMap ? (
        <meshStandardMaterial
          map={diffuseMap}
          roughness={0.9}
          metalness={0.05}
        />
      ) : (
        <meshStandardMaterial
          color={color}
          roughness={0.9}
          metalness={0.05}
        />
      )}
    </mesh>
  );
}

interface MoonMiniSceneProps {
  moon: Moon;
}

export function MoonMiniScene({ moon }: MoonMiniSceneProps) {
  return (
    <div className="moon-detail__mini-scene" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.5, 2.8], fov: 40, near: 0.1, far: 20 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[4, 2, 5]} intensity={1.0} />

        <SpinningMoon moon={moon} />

        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={6}
          enableDamping
          dampingFactor={0.1}
        />
      </Canvas>
    </div>
  );
}
