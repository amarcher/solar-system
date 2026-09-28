import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, Line, LineLoop, ShaderMaterial, MathUtils, Vector3, type Group, type Mesh, type Points, type PointsMaterial } from 'three';
import { useAstronomy } from '../../astronomy/useAstronomy';
import { keplerPath, keplerPosition } from '../../astronomy/keplerOrbit';
import { scaleAUVector } from '../../astronomy/realisticScale';
import { useFocusedSpace } from '../../sceneLayout/useFocusedSpace';
import { applyFocusSpace } from '../../sceneLayout/focusedSpace';
import { getSmallBodyPosition, setSmallBodyPosition } from '../../utils/planetPositions';
import { RUBIN_KIND_COLORS, rubinVisualRadius, type RubinAsteroid } from '../../data/rubinAsteroids';
import { createRockGeometry, irregularityForDiameter, seedFromString } from '../../utils/asteroidRock';

/** Minimum recompute interval in ms of simulation time. */
const RECOMPUTE_THRESHOLD_MS = 1000;
// Dense enough that log-compressed, very eccentric orbits stay smooth.
const PATH_SAMPLES = 2048;
/** How far out to draw an interstellar path, AU. */
const HYPERBOLIC_PATH_LIMIT_AU = 40;

function toScene(p: { x: number; y: number; z: number }, target: Vector3): Vector3 {
  // Same ecliptic → scene mapping as RealisticPlanet.
  const s = scaleAUVector(p.x, p.z, -p.y);
  return target.set(s.x, s.y, s.z);
}

/** Fastest on-screen spin, radians per real second, so accelerated time doesn't strobe. */
const MAX_SPIN = (Math.PI * 2) / 1.5;
/** Spin period drawn when none has been measured, hours. */
const DEFAULT_SPIN_HOURS = 6;
/**
 * The pinpoint fades in between these camera distances (in rock radii): gone
 * while the rock itself is visible, full strength once the rock is subpixel.
 */
const PINPOINT_FADE_START_RADII = 50;
const PINPOINT_FADE_END_RADII = 150;
const PINPOINT_OPACITY = 0.55;

let dotTexture: CanvasTexture | null = null;
/** Soft round dot so points don't render as GPU squares. */
function getDotTexture(): CanvasTexture {
  if (dotTexture) return dotTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  dotTexture = new CanvasTexture(canvas);
  return dotTexture;
}

let comaTexture: CanvasTexture | null = null;
function getComaTexture(): CanvasTexture {
  if (comaTexture) return comaTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(220,255,250,0.9)');
  g.addColorStop(0.25, 'rgba(140,240,230,0.35)');
  g.addColorStop(1, 'rgba(100,220,220,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  comaTexture = new CanvasTexture(canvas);
  return comaTexture;
}

function AsteroidMarker({ asteroid, selected, showLabel, onSelect }: {
  asteroid: RubinAsteroid;
  selected: boolean;
  showLabel: boolean;
  onSelect: (id: string) => void;
}) {
  const group = useRef<Group>(null);
  const rock = useRef<Mesh>(null);
  const pinpoint = useRef<Points>(null);
  const hit = useRef<Mesh>(null);
  const raw = useRef(new Vector3());
  const lastComputed = useRef(Number.NaN);
  const { timeRef, rate } = useAstronomy();
  const space = useFocusedSpace();
  const color = RUBIN_KIND_COLORS[asteroid.kind];
  // A softened tint of the category color: findable, not fluorescent.
  const pinpointColor = useMemo(() => new Color(color).lerp(new Color('#c8ccd4'), 0.45), [color]);
  const radius = rubinVisualRadius(asteroid.diameterKm);
  const seed = seedFromString(asteroid.id);

  // Close-up detail only for the selected object; the rest stay cheap.
  const geometry = useMemo(
    () => createRockGeometry({
      seed,
      composition: asteroid.composition,
      detail: selected ? 48 : 6,
      irregularity: irregularityForDiameter(asteroid.diameterKm),
    }),
    [seed, asteroid.composition, asteroid.diameterKm, selected],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const spinAxis = useMemo(() => {
    const r = (n: number) => ((seed >>> n) & 0xff) / 255 - 0.5;
    return new Vector3(r(0) * 0.8, 1, r(8) * 0.8).normalize();
  }, [seed]);
  const spinRate = (Math.PI * 2) / ((asteroid.rotationHours ?? DEFAULT_SPIN_HOURS) * 3600);

  useFrame(({ camera }, delta) => {
    if (!group.current) return;
    const now = timeRef.current;
    if (!(Math.abs(now - lastComputed.current) <= RECOMPUTE_THRESHOLD_MS)) {
      lastComputed.current = now;
      toScene(keplerPosition(asteroid.elements, now), raw.current);
    }
    const position = applyFocusSpace(space, raw.current, group.current.position);
    setSmallBodyPosition(asteroid.id, position);

    if (rock.current && rate !== 0) {
      const spin = Math.sign(rate) * Math.min(MAX_SPIN, Math.abs(spinRate * rate));
      rock.current.rotateOnAxis(spinAxis, spin * Math.min(delta, 0.1));
    }
    const distance = camera.position.distanceTo(position);
    if (pinpoint.current) {
      // The selected object is highlighted by its orbit and label instead.
      const t = selected ? 0 : MathUtils.smoothstep(distance / radius, PINPOINT_FADE_START_RADII, PINPOINT_FADE_END_RADII);
      (pinpoint.current.material as PointsMaterial).opacity = t * PINPOINT_OPACITY;
      pinpoint.current.visible = t > 0.01;
    }
    // Keep the tap target roughly finger-sized on screen at any zoom.
    if (hit.current) hit.current.scale.setScalar(Math.max(radius * 1.4, distance * 0.025));
  }, -3);

  const select = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(asteroid.id);
  };

  return (
    <group ref={group}>
      <mesh ref={rock} geometry={geometry} scale={radius}>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
      </mesh>
      {asteroid.composition === 'comet' && (
        <sprite scale={radius * 4.5}>
          <spriteMaterial map={getComaTexture()} transparent opacity={0.45} depthWrite={false} blending={AdditiveBlending} />
        </sprite>
      )}
      <points ref={pinpoint}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array(3), 3]} />
        </bufferGeometry>
        <pointsMaterial color={pinpointColor} map={getDotTexture()} size={5} sizeAttenuation={false} transparent depthWrite={false} toneMapped={false} />
      </points>
      <mesh ref={hit} onClick={select} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {showLabel && (
        <Html position={[0, -radius * 2.2, 0]} center style={{ pointerEvents: 'none' }}>
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

// The path runs through the body itself. Hide any stretch of line that lands
// on top of the rock on screen (same idea as HeliocentricOrbit), so it
// doesn't slice across the surface in close-ups.
const PATH_VERTEX = `varying vec3 worldPosition;
void main() { vec4 world = modelMatrix * vec4(position, 1.0); worldPosition = world.xyz; gl_Position = projectionMatrix * viewMatrix * world; }`;
const PATH_FRAGMENT = `uniform vec3 color; uniform float opacity; uniform vec3 focus; uniform float clearance; varying vec3 worldPosition;
void main() {
  vec3 ray = normalize(worldPosition - cameraPosition);
  vec3 toFocus = focus - cameraPosition;
  float missBy = length(toFocus - ray * max(dot(toFocus, ray), 0.0));
  float gap = smoothstep(clearance, clearance * 1.6, missBy);
  gl_FragColor = vec4(color, opacity * gap);
}`;

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
    const material = new ShaderMaterial({
      uniforms: {
        color: { value: new Color(RUBIN_KIND_COLORS[asteroid.kind]) },
        opacity: { value: 0.55 },
        focus: { value: new Vector3() },
        clearance: { value: rubinVisualRadius(asteroid.diameterKm) * 1.25 },
      },
      vertexShader: PATH_VERTEX,
      fragmentShader: PATH_FRAGMENT,
      transparent: true,
      depthWrite: false,
    });
    // Interstellar paths are open; everything else closes on itself.
    return asteroid.elements.e < 1 ? new LineLoop(geometry, material) : new Line(geometry, material);
  }, [asteroid]);

  useEffect(() => () => {
    line.geometry.dispose();
    (line.material as ShaderMaterial).dispose();
  }, [line]);

  useFrame(() => {
    if (!group.current) return;
    group.current.position.copy(space.offset);
    group.current.scale.setScalar(space.scale);
    const body = getSmallBodyPosition(asteroid.id);
    if (body) (line.material as ShaderMaterial).uniforms.focus.value.copy(body);
  }, -2);

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
