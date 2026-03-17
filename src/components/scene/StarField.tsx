import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Points } from 'three';

const STAR_COUNT = 3000;

export function StarField() {
  const ref = useRef<Points>(null);

  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    const col = new Float32Array(STAR_COUNT * 3);
    const sz = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      // Distribute on a sphere shell at large radius
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 150 + Math.random() * 50;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Color variation by spectral class
      const temp = Math.random();
      if (temp < 0.05) {
        // O/B type — blue-white (rare, bright)
        col[i * 3] = 0.65;
        col[i * 3 + 1] = 0.75;
        col[i * 3 + 2] = 1.0;
        sz[i] = 0.5 + Math.random() * 0.6;
      } else if (temp < 0.12) {
        // A type — white-blue
        col[i * 3] = 0.8;
        col[i * 3 + 1] = 0.85;
        col[i * 3 + 2] = 1.0;
        sz[i] = 0.35 + Math.random() * 0.4;
      } else if (temp < 0.22) {
        // G type — yellow (Sun-like)
        col[i * 3] = 1.0;
        col[i * 3 + 1] = 0.92;
        col[i * 3 + 2] = 0.7;
        sz[i] = 0.3 + Math.random() * 0.3;
      } else if (temp < 0.32) {
        // K type — orange
        col[i * 3] = 1.0;
        col[i * 3 + 1] = 0.75;
        col[i * 3 + 2] = 0.5;
        sz[i] = 0.25 + Math.random() * 0.25;
      } else if (temp < 0.40) {
        // M type — red (common but dim)
        col[i * 3] = 1.0;
        col[i * 3 + 1] = 0.6;
        col[i * 3 + 2] = 0.4;
        sz[i] = 0.15 + Math.random() * 0.2;
      } else {
        // F/G type — white (most common visible)
        col[i * 3] = 1.0;
        col[i * 3 + 1] = 1.0;
        col[i * 3 + 2] = 0.95;
        sz[i] = 0.2 + Math.random() * 0.3;
      }
    }

    return [pos, col, sz];
  }, []);

  // Very slow rotation for subtle parallax
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.002;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.4}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}
