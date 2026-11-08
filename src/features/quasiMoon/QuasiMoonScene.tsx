import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { PerspectiveCamera, Vector3, type Group } from 'three';
import { useAstronomy } from '../../astronomy/useAstronomy';
import { scaleAUVector } from '../../astronomy/realisticScale';
import { useFocusedSpace } from '../../sceneLayout/useFocusedSpace';
import { applyFocusSpace } from '../../sceneLayout/focusedSpace';
import { setSmallBodyPosition } from '../../utils/planetPositions';
import { heliocentric, solarPath, sceneVector } from './model';
import { REPLAY_START, REPLAY_DAYS, REPLAY_SECONDS, type QuasiMoonPlayback } from './types';

const path = solarPath.map(([x, y, z]) => {
  const p = scaleAUVector(x, y, z);
  return [p.x, p.y, p.z] as [number, number, number];
});

/** An additive Orrery layer: uses its existing planets, lights, camera and scale. */
export default function QuasiMoonScene({ dayRef, playing, onComplete, overview }: QuasiMoonPlayback & { overview: boolean }) {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    if (overview && size.width < 900) camera.setViewOffset(size.width, size.height, 0, size.height * .17, size.width, size.height);
    else camera.clearViewOffset();
    return () => { camera.clearViewOffset(); };
  }, [camera, size.width, size.height, overview]);
  const body = useRef<Group>(null);
  const orbit = useRef<Group>(null);
  const raw = useRef(new Vector3());
  const space = useFocusedSpace();
  const { timeRef, engineReady } = useAstronomy();

  // Set the shared epoch before the ordinary planet callbacks (priority -4).
  useFrame((_, delta) => {
    if (playing && engineReady) {
      dayRef.current = Math.min(REPLAY_DAYS, dayRef.current + Math.min(delta, .1) * REPLAY_DAYS / REPLAY_SECONDS);
      if (dayRef.current === REPLAY_DAYS) onComplete();
    }
    timeRef.current = REPLAY_START + dayRef.current * 86400000;
  }, -5);

  useFrame(() => {
    if (!body.current || !orbit.current) return;
    const [x, y, z] = sceneVector(heliocentric(dayRef.current).asteroid);
    const p = scaleAUVector(x, y, z);
    raw.current.set(p.x, p.y, p.z);
    applyFocusSpace(space, raw.current, body.current.position);
    setSmallBodyPosition('kamo-oalewa', body.current.position);
    orbit.current.position.copy(space.offset);
    orbit.current.scale.setScalar(space.scale);
  }, -3);

  return <>
    <group ref={orbit}><Line points={path} color="#f3cf97" lineWidth={1.5} transparent opacity={.65} /></group>
    <group ref={body}>
      <mesh scale={[1, .7, .85]}>
        <icosahedronGeometry args={[.035, 1]} />
        <meshStandardMaterial color="#ba986b" emissive="#a76621" emissiveIntensity={.4} roughness={1} flatShading />
      </mesh>
      <Html center position={[0, .12, 0]} style={{ pointerEvents: 'none' }}>
        <span className="quasi-marker" data-quasi-marker>Kamoʻoalewa</span>
      </Html>
    </group>
  </>;
}
