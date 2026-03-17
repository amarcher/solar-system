import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { InstancedMesh } from 'three';

const ASTEROID_COUNT = 600;
// Belt sits between Mars (~13) and Jupiter (~20)
const INNER_RADIUS = 14.5;
const OUTER_RADIUS = 18.5;

export function AsteroidBelt() {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const asteroids = useMemo(() => {
    const data: { angle: number; radius: number; y: number; speed: number; scale: number }[] = [];
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      data.push({
        angle: Math.random() * Math.PI * 2,
        radius: INNER_RADIUS + Math.random() * (OUTER_RADIUS - INNER_RADIUS),
        y: (Math.random() - 0.5) * 0.8,
        speed: 0.005 + Math.random() * 0.01,
        scale: 0.02 + Math.random() * 0.06,
      });
    }
    return data;
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const a = asteroids[i];
      a.angle += delta * a.speed;
      dummy.position.set(
        Math.cos(a.angle) * a.radius,
        a.y,
        Math.sin(a.angle) * a.radius,
      );
      dummy.scale.setScalar(a.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, ASTEROID_COUNT]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#8a7e6e" roughness={0.9} />
    </instancedMesh>
  );
}
