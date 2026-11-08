import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import { BufferAttribute, BufferGeometry, Line as ThreeLine, LineBasicMaterial, Vector3 } from 'three';
import type { Group, Mesh } from 'three';
import { usePlanetTexture } from '../../utils/textures';
import { heliocentric, earthFrame, sceneVector, earthPath, solarPath, relativePath } from './model';
import { REPLAY_DAYS, REPLAY_SECONDS, type QuasiMoonPlayback } from './types';

function updateTrail(trail: ThreeLine<BufferGeometry, LineBasicMaterial>, day: number, p: [number, number, number]) {
  const positions = trail.geometry.attributes.position as BufferAttribute;
  const count = Math.floor(day);
  for (let i = 0; i <= count; i++) positions.setXYZ(i, ...relativePath[i]);
  positions.setXYZ(count + 1, ...p);
  positions.needsUpdate = true;
  trail.geometry.setDrawRange(0, count + 2);
  trail.geometry.computeBoundingSphere();
}

export default function QuasiMoonScene({ dayRef, view, playing, onComplete }: QuasiMoonPlayback) {
  const { camera, size } = useThree();
  const earth = useRef<Group>(null);
  const asteroid = useRef<Group>(null);
  const rock = useRef<Mesh>(null);
  const texture = usePlanetTexture('earth', { maxWidth: 1024 });
  const isEarth = view === 'earth';
  const trail = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(367 * 3), 3));
    return new ThreeLine(geometry, new LineBasicMaterial({ color: '#ffd18d' }));
  }, []);
  useEffect(() => () => { trail.geometry.dispose(); trail.material.dispose(); }, [trail]);

  useEffect(() => {
    const portrait = size.width < size.height;
    camera.position.set(...(isEarth ? [0.035, .78, .76] : [0, 4.5, 4.9]) as [number, number, number]);
    if (portrait) camera.position.multiplyScalar(1.17);
    camera.lookAt(0, portrait ? (isEarth ? -.2 : -1) : 0, isEarth ? .065 : 0);
    camera.updateProjectionMatrix();
  }, [camera, isEarth, size.width, size.height]);

  useFrame((_, delta) => {
    if (playing) {
      // Hidden-tab time must not skip the entire replay on return.
      dayRef.current = Math.min(REPLAY_DAYS, dayRef.current + Math.min(delta, .1) * REPLAY_DAYS / REPLAY_SECONDS);
      if (dayRef.current === REPLAY_DAYS) onComplete();
    }
    const h = heliocentric(dayRef.current);
    const p = sceneVector(isEarth ? earthFrame(h.earth, h.asteroid) : h.asteroid);
    const ep = isEarth ? [0, 0, 0] : sceneVector(h.earth);
    earth.current?.position.set(ep[0], ep[1], ep[2]);
    asteroid.current?.position.set(...p);
    if (rock.current) rock.current.rotation.set(.4, .7, .2);
    updateTrail(trail, dayRef.current, p);
  });

  const target = useMemo(() => new Vector3(0, size.width < size.height ? (isEarth ? -.2 : -1) : 0, isEarth ? .065 : 0), [isEarth, size.width, size.height]);
  return <>
    <color attach="background" args={['#070b14']} />
    <ambientLight intensity={.4} />
    {isEarth ? <directionalLight position={[-2, .2, .1]} intensity={3} /> : <pointLight position={[0, 0, 0]} intensity={3} decay={0} />}
    <group ref={earth}>
      <mesh>
        <sphereGeometry args={[isEarth ? .021 : .045, 48, 32]} />
        <meshStandardMaterial key={texture?.uuid ?? 'loading-earth'} map={texture} color={texture ? '#ffffff' : '#4f88ae'} roughness={.95} />
      </mesh>
      <Html center position={[0, isEarth ? -.036 : -.075, 0]}><span className="quasi-label quasi-label--earth">Earth</span></Html>
    </group>
    <group ref={asteroid}>
      <mesh ref={rock}>
        <icosahedronGeometry args={[isEarth ? .0045 : .012, 1]} />
        <meshStandardMaterial color="#e0b679" emissive="#a76621" emissiveIntensity={.5} flatShading />
      </mesh>
      <Html center position={[0, isEarth ? .018 : .045, 0]}><span className="quasi-label">Kamoʻoalewa</span></Html>
    </group>
    {isEarth ? <>
      <Line points={relativePath} color="#f8c98b" transparent opacity={.16} lineWidth={1} />
      <primitive object={trail} />
      <Line points={[[-.16, 0, 0], [-.045, 0, 0]]} color="#8292a6" lineWidth={1} />
      <Line points={[[-.145, 0, -.008], [-.16, 0, 0], [-.145, 0, .008]]} color="#8292a6" lineWidth={1} />
      <Html center position={[-.12, .018, 0]}><span className="quasi-label quasi-label--sun">Toward the Sun</span></Html>
    </> : <>
      <mesh><sphereGeometry args={[.075, 32, 24]} /><meshBasicMaterial color="#ffe7ac" /></mesh>
      <Html center position={[0, -.12, 0]}><span className="quasi-label quasi-label--sun">Sun</span></Html>
      <Line points={earthPath} color="#6cb6df" lineWidth={1} />
      <Line points={solarPath} color="#ffd18d" lineWidth={1.5} />
    </>}
    <OrbitControls key={view} target={target} enablePan={false} minDistance={isEarth ? .6 : 3} maxDistance={isEarth ? 2 : 12} enableDamping={false} />
  </>;
}
