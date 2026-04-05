import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import type { InstancedMesh } from 'three';
import { TextureLoader } from 'three';

const ASTEROID_COUNT = 600;
const VARIANTS = 3;
const PER_VARIANT = Math.ceil(ASTEROID_COUNT / VARIANTS);
// Belt sits between Mars (~13) and Jupiter (~20)
const INNER_RADIUS = 14.5;
const OUTER_RADIUS = 18.5;

/** Deform an icosahedron's vertices with seeded noise to create an irregular rock shape. */
function createRockGeometry(seed: number): THREE.IcosahedronGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    // Deterministic per-vertex displacement
    const noise = 0.7 + 0.6 * Math.abs(Math.sin(seed * 13.37 + i * 7.91 + x * 3.1 + y * 5.3 + z * 2.7));
    const scale = noise;
    pos.setXYZ(i, (x / len) * scale, (y / len) * scale, (z / len) * scale);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

interface AsteroidData {
  angle: number;
  radius: number;
  y: number;
  speed: number;
  scale: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  spinSpeed: number;
}

const TEXTURE_PATHS = [
  '/textures/asteroids/rock_01.jpg',
  '/textures/asteroids/rock_02.jpg',
  '/textures/asteroids/rock_03.jpg',
];

function AsteroidGroup({ variant, asteroids }: { variant: number; asteroids: AsteroidData[] }) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => createRockGeometry(variant * 17 + 42), [variant]);
  const textures = useLoader(TextureLoader, TEXTURE_PATHS);

  const material = useMemo(() => {
    const tex = textures[variant % textures.length];
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.95,
      metalness: 0.05,
    });
  }, [textures, variant]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    for (let i = 0; i < asteroids.length; i++) {
      const a = asteroids[i];
      a.angle += delta * a.speed;
      a.rotX += delta * a.spinSpeed * 0.3;
      a.rotY += delta * a.spinSpeed;
      dummy.position.set(
        Math.cos(a.angle) * a.radius,
        a.y,
        Math.sin(a.angle) * a.radius,
      );
      dummy.rotation.set(a.rotX, a.rotY, a.rotZ);
      dummy.scale.setScalar(a.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, asteroids.length]}>
    </instancedMesh>
  );
}

export function AsteroidBelt() {
  const allAsteroids = useMemo(() => {
    const groups: AsteroidData[][] = Array.from({ length: VARIANTS }, () => []);
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      groups[i % VARIANTS].push({
        angle: Math.random() * Math.PI * 2,
        radius: INNER_RADIUS + Math.random() * (OUTER_RADIUS - INNER_RADIUS),
        y: (Math.random() - 0.5) * 0.8,
        speed: 0.005 + Math.random() * 0.01,
        scale: 0.01 + Math.random() * 0.025,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        spinSpeed: 0.1 + Math.random() * 0.4,
      });
    }
    return groups;
  }, []);

  return (
    <>
      {allAsteroids.map((asteroids, i) => (
        <AsteroidGroup key={i} variant={i} asteroids={asteroids} />
      ))}
    </>
  );
}
