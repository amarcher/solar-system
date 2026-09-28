import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial, LineLoop, Vector3, type Group } from 'three';
import { useAstronomy } from '../../astronomy/useAstronomy';
import { keplerPath, keplerPosition } from '../../astronomy/keplerOrbit';
import { scaleAUVector } from '../../astronomy/realisticScale';
import { useFocusedSpace } from '../../sceneLayout/useFocusedSpace';
import { applyFocusSpace } from '../../sceneLayout/focusedSpace';
import { RUBIN_KIND_COLORS, type RubinAsteroid } from '../../data/rubinAsteroids';

/** Minimum recompute interval in ms of simulation time. */
const RECOMPUTE_THRESHOLD_MS = 1000;
const PATH_SAMPLES = 256;
/** How far out to draw an interstellar path, AU. */
const HYPERBOLIC_PATH_LIMIT_AU = 40;

function toScene(p: { x: number; y: number; z: number }, target: Vector3): Vector3 {
  // Same ecliptic → scene mapping as RealisticPlanet.
  const s = scaleAUVector(p.x, p.z, -p.y);
  return target.set(s.x, s.y, s.z);
}

function AsteroidMarker({ asteroid, selected, showLabel, onSelect }: {
  asteroid: RubinAsteroid;
  selected: boolean;
  showLabel: boolean;
  onSelect: (id: string) => void;
}) {
  const group = useRef<Group>(null);
  const raw = useRef(new Vector3());
  const lastComputed = useRef(Number.NaN);
  const { timeRef } = useAstronomy();
  const space = useFocusedSpace();
  const color = RUBIN_KIND_COLORS[asteroid.kind];

  useFrame(() => {
    if (!group.current) return;
    const now = timeRef.current;
    if (!(Math.abs(now - lastComputed.current) <= RECOMPUTE_THRESHOLD_MS)) {
      lastComputed.current = now;
      toScene(keplerPosition(asteroid.elements, now), raw.current);
    }
    applyFocusSpace(space, raw.current, group.current.position);
  }, -3);

  const select = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(asteroid.id);
  };

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[selected ? 0.1 : 0.06, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Generous invisible hit area: the visible dot is far too small for a finger. */}
      <mesh onClick={select} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {showLabel && (
        <Html position={[0, -0.28, 0]} center style={{ pointerEvents: 'none' }}>
          <button
            type="button"
            className="scene-label scene-label--asteroid"
            style={{ '--asteroid-color': color } as CSSProperties}
            aria-label={`About ${asteroid.name}`}
            onClick={(e) => { e.stopPropagation(); onSelect(asteroid.id); }}
          >
            {asteroid.name}
          </button>
        </Html>
      )}
    </group>
  );
}

function AsteroidPath({ asteroid }: { asteroid: RubinAsteroid }) {
  const group = useRef<Group>(null);
  const space = useFocusedSpace();

  const line = useMemo(() => {
    const path = keplerPath(asteroid.elements, PATH_SAMPLES, HYPERBOLIC_PATH_LIMIT_AU);
    const points = new Float32Array(path.length * 3);
    const v = new Vector3();
    path.forEach((p, k) => {
      toScene(p, v);
      points[k * 3] = v.x;
      points[k * 3 + 1] = v.y;
      points[k * 3 + 2] = v.z;
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(points, 3));
    const material = new LineBasicMaterial({
      color: RUBIN_KIND_COLORS[asteroid.kind],
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      toneMapped: false,
    });
    // Interstellar paths are open; everything else closes on itself.
    return asteroid.elements.e < 1 ? new LineLoop(geometry, material) : new Line(geometry, material);
  }, [asteroid]);

  useEffect(() => () => {
    line.geometry.dispose();
    (line.material as LineBasicMaterial).dispose();
  }, [line]);

  useFrame(() => {
    if (!group.current) return;
    group.current.position.copy(space.offset);
    group.current.scale.setScalar(space.scale);
  }, -3);

  return (
    <group ref={group}>
      <primitive object={line} />
    </group>
  );
}

export function RubinAsteroids({ asteroids, selectedId, showLabels, onSelect }: {
  asteroids: RubinAsteroid[];
  selectedId: string | null;
  showLabels: boolean;
  onSelect: (id: string) => void;
}) {
  const selected = asteroids.find((a) => a.id === selectedId);
  return (
    <>
      {asteroids.map((asteroid) => (
        <AsteroidMarker
          key={asteroid.id}
          asteroid={asteroid}
          selected={asteroid.id === selectedId}
          // Near-Earth objects cluster around 1 AU; labeling all of them is noise.
          showLabel={showLabels && asteroid.id === selectedId}
          onSelect={onSelect}
        />
      ))}
      {selected && <AsteroidPath asteroid={selected} />}
    </>
  );
}
