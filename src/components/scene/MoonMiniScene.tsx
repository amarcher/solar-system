import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Mesh } from 'three';
import type { Moon } from '../../types/celestialBody';

function SpinningMoon({ moon }: { moon: Moon }) {
  const meshRef = useRef<Mesh>(null);

  // Tidally locked moons rotate once per orbit; others spin faster
  const speed = useMemo(() => {
    // Most moons are tidally locked, so one rotation per orbital period
    // Scale: one orbit in ~6s screen time → one rotation in ~6s
    return (Math.PI * 2) / 6;
  }, []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * speed;
    }
  });

  // Size scales with diameter, but clamped to look good in the mini scene
  const radius = useMemo(() => {
    return Math.max(0.6, Math.min(1.2, Math.log10(Math.max(moon.diameter, 10) / 100) * 0.5 + 0.8));
  }, [moon.diameter]);

  // Moon color based on some basic characteristics
  const color = useMemo(() => {
    const id = moon.id;
    if (id === 'io') return '#c8b040';             // sulfur yellow
    if (id === 'europa') return '#d4d0c8';          // bright ice
    if (id === 'titan') return '#c4a060';            // hazy orange
    if (id === 'enceladus') return '#e8e8f0';        // brilliant white
    if (id === 'triton') return '#b0c8d0';           // pale blue-pink
    if (id === 'moon') return '#b8b4a8';             // grey
    if (id === 'charon') return '#a89888';            // tan
    if (id === 'ganymede') return '#b8b0a0';          // light grey-brown
    if (id === 'callisto') return '#888078';           // dark grey
    if (id === 'iapetus') return '#a09080';            // two-toned (averaged)
    return '#b0b0b0';                                  // default grey
  }, [moon.id]);

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
    </>
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
