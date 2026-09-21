import { useFocusedSpace } from '../../sceneLayout/useFocusedSpace';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import type { InstancedMesh, Texture } from 'three';
import { TextureLoader } from 'three';
import { texturePath } from '../../utils/textures';

const ASTEROID_COUNT = 600;
const VARIANTS = 3;
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

function createSeededRandom(seed: number) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function createAsteroidGroups(): AsteroidData[][] {
  const random = createSeededRandom(0x5a17e01d);
  const groups: AsteroidData[][] = Array.from({ length: VARIANTS }, () => []);
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    groups[i % VARIANTS].push({
      angle: random() * Math.PI * 2,
      radius: INNER_RADIUS + random() * (OUTER_RADIUS - INNER_RADIUS),
      y: (random() - 0.5) * 0.8,
      speed: 0.005 + random() * 0.01,
      scale: 0.01 + random() * 0.025,
      rotX: random() * Math.PI * 2,
      rotY: random() * Math.PI * 2,
      rotZ: random() * Math.PI * 2,
      spinSpeed: 0.1 + random() * 0.4,
    });
  }
  return groups;
}

function createAsteroidMaterial(sourceTexture: Texture): THREE.MeshStandardMaterial {
  const texture = sourceTexture.clone();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.95,
    metalness: 0.05,
  });
}

const ASTEROID_GROUPS = createAsteroidGroups();

const TEXTURE_PATHS = [
  texturePath('/textures/asteroids/rock_01.jpg'),
  texturePath('/textures/asteroids/rock_02.jpg'),
  texturePath('/textures/asteroids/rock_03.jpg'),
];

function AsteroidGroup({ variant, asteroids, paused }: { variant: number; asteroids: AsteroidData[]; paused?: boolean }) {
  const meshRef = useRef<InstancedMesh>(null);
  const space = useFocusedSpace();
  const asteroidStateRef = useRef(asteroids.map((asteroid) => ({ ...asteroid })));
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => createRockGeometry(variant * 17 + 42), [variant]);
  const textures = useLoader(TextureLoader, TEXTURE_PATHS);

  const material = useMemo(
    () => createAsteroidMaterial(textures[variant % textures.length]),
    [textures, variant],
  );

  useEffect(() => () => {
    geometry.dispose();
    material.map?.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = paused ? 0 : delta;
    const asteroidState = asteroidStateRef.current;
    for (let i = 0; i < asteroidState.length; i++) {
      const a = asteroidState[i];
      a.angle += dt * a.speed;
      a.rotX += dt * a.spinSpeed * 0.3;
      a.rotY += dt * a.spinSpeed;
      dummy.position.set(
        Math.cos(a.angle) * a.radius,
        a.y,
        Math.sin(a.angle) * a.radius,
      );
      dummy.position.multiplyScalar(space.scale).add(space.offset);
      dummy.rotation.set(a.rotX, a.rotY, a.rotZ);
      dummy.scale.setScalar(a.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} frustumCulled={false} args={[geometry, material, asteroids.length]}>
    </instancedMesh>
  );
}

export function AsteroidBelt({ paused }: { paused?: boolean } = {}) {
  return (
    <>
      {ASTEROID_GROUPS.map((asteroids, i) => (
        <AsteroidGroup key={i} variant={i} asteroids={asteroids} paused={paused} />
      ))}
    </>
  );
}
