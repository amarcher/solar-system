import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Color, DoubleSide, RingGeometry } from 'three';
import type { Mesh } from 'three';
import type { Planet } from '../../types/celestialBody';
import { usePlanetTexture, useTexturePath, useRingTexture } from '../../utils/textures';
import * as AstronomyService from '../../astronomy/AstronomyService';
import './SceneLabels.css';

interface PlanetMeshProps {
  planet: Planet;
  onClick?: () => void;
  showLabel?: boolean;
  /** When true, moons are visible — shrink hit area so moon clicks get through */
  showMoons?: boolean;
  paused?: boolean;
  /** Multiplier for rotation speed. Only used with artistic rotation. */
  timeScale?: number;
  /** When true, rotation is physically accurate: one full rotation per rotationPeriod of sim time. */
  useRealRotation?: boolean;
  /** Simulation time ref for absolute rotation computation (orrery mode). */
  timeRef?: React.RefObject<number>;
}

const TWO_PI = Math.PI * 2;

export function PlanetMesh({ planet, onClick, showLabel = true, showMoons = false, paused = false, timeScale = 1, useRealRotation = false, timeRef }: PlanetMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const cloudRef = useRef<Mesh>(null);
  const diffuseMap = usePlanetTexture(planet.id);
  const cloudMap = useTexturePath(planet.id === 'earth' ? '/textures/2k/earth_clouds.jpg' : '');

  useFrame((_, delta) => {
    if (paused) return;

    if (useRealRotation && timeRef) {
      // Compute absolute rotation from simulation time so continents face
      // the correct direction (e.g. sunlit side of Earth matches real life).
      const simTimeMs = timeRef.current;

      if (planet.id === 'earth' && AstronomyService.isReady()) {
        // Use Greenwich Mean Sidereal Time for Earth — this tells us exactly
        // how much Earth has rotated relative to the vernal equinox.
        // GMST is in hours (0–24). Convert to radians.
        // In Three.js SphereGeometry, the texture center (u=0.5 = prime meridian)
        // maps to the +X direction at rotation.y=0.
        // The heliocentric frame has +X toward the vernal equinox.
        // So rotation.y = GMST_radians places Greenwich correctly.
        const gmstHours = AstronomyService.getSiderealTime(new Date(simTimeMs));
        const gmstRad = gmstHours * (TWO_PI / 24);
        if (meshRef.current) meshRef.current.rotation.y = gmstRad;
        if (cloudRef.current) cloudRef.current.rotation.y = gmstRad + simTimeMs * 0.0000000001;
      } else {
        // Other planets: compute rotation from J2000 epoch.
        // We don't know their prime meridian orientation, but consistent
        // rotation relative to time is still correct.
        const J2000_MS = 946684800000; // 2000-01-01T00:00:00Z
        const elapsed = simTimeMs - J2000_MS;
        const periodMs = Math.abs(planet.rotationPeriod) * 3600 * 1000;
        const direction = planet.rotationPeriod < 0 ? -1 : 1;
        const rotation = periodMs > 0 ? (elapsed / periodMs) * TWO_PI * direction : 0;
        if (meshRef.current) meshRef.current.rotation.y = rotation % TWO_PI;
        if (cloudRef.current) cloudRef.current.rotation.y = rotation % TWO_PI;
      }
    } else if (useRealRotation) {
      // Fallback: accumulate delta if no timeRef (shouldn't happen in orrery)
      const periodSec = Math.abs(planet.rotationPeriod) * 3600;
      const angularVel = periodSec > 0 ? TWO_PI / periodSec : 0;
      const direction = planet.rotationPeriod < 0 ? -1 : 1;
      const simDelta = delta * timeScale;
      if (meshRef.current) meshRef.current.rotation.y += simDelta * angularVel * direction;
      if (cloudRef.current) cloudRef.current.rotation.y += simDelta * angularVel * direction;
    } else {
      // Artistic rotation (explore mode)
      const scaledDelta = delta * timeScale;
      if (meshRef.current) {
        const speed = planet.rotationPeriod !== 0 ? 0.3 / Math.abs(planet.rotationPeriod / 24) : 0.1;
        const direction = planet.rotationPeriod < 0 ? -1 : 1;
        meshRef.current.rotation.y += scaledDelta * speed * direction;
      }
      if (cloudRef.current) {
        const speed = planet.rotationPeriod !== 0 ? 0.3 / Math.abs(planet.rotationPeriod / 24) : 0.1;
        const direction = planet.rotationPeriod < 0 ? -1 : 1;
        cloudRef.current.rotation.y += scaledDelta * speed * direction + scaledDelta * 0.008;
      }
    }
  });

  const isGasGiant = planet.category === 'gas-giant' || planet.category === 'ice-giant';
  const segments = isGasGiant ? 48 : 32;

  // When textured, use a near-white color with a subtle planet color cast.
  // Lerp 15% toward planet.color so the texture drives appearance while
  // retaining a hint of the characteristic hue. Full planet.color was
  // crushing texture detail (e.g. Earth's blue killed continent greens).
  const tintColor = useMemo(() => {
    if (diffuseMap) {
      const c = new Color('#ffffff');
      c.lerp(new Color(planet.color), 0.15);
      return c;
    }
    return new Color(planet.color);
  }, [planet.color, diffuseMap]);

  // R3F doesn't always detect map changing from undefined → Texture on re-render.
  // Imperatively apply the texture when it finishes loading.
  useEffect(() => {
    if (meshRef.current?.material && diffuseMap) {
      const mat = meshRef.current.material as any;
      mat.map = diffuseMap;
      mat.needsUpdate = true;
    }
  }, [diffuseMap]);

  // When moons are visible, use the actual planet radius so we don't block moon clicks.
  // In system view, use a generous hit area so small planets are easy to tap.
  const hitRadius = showMoons
    ? planet.visualRadius
    : Math.max(planet.visualRadius * 3, 1.0);

  const axialTiltRad = planet.axialTilt * (Math.PI / 180);

  return (
    <group>
      {/* Invisible enlarged hit area for easier clicking/tapping */}
      {!showMoons && (
        <mesh
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = ''; }}
          visible={false}
        >
          <sphereGeometry args={[hitRadius, 16, 16]} />
          <meshBasicMaterial />
        </mesh>
      )}

      {/* Axial tilt group — everything inside spins around the tilted local Y axis */}
      <group rotation-z={axialTiltRad}>
        {/* Planet sphere */}
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        >
          <sphereGeometry args={[planet.visualRadius, segments, segments]} />
          <meshStandardMaterial
            map={diffuseMap ?? undefined}
            color={tintColor}
            roughness={0.7}
            metalness={0}
          />
        </mesh>

        {/* Earth cloud layer — slightly larger sphere rotating independently */}
        {planet.id === 'earth' && cloudMap && (
          <mesh ref={cloudRef}>
            <sphereGeometry args={[planet.visualRadius * 1.015, segments, segments]} />
            <meshStandardMaterial
              map={cloudMap}
              transparent
              opacity={0.25}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* Rings — Saturn and Uranus only. Jupiter's and Neptune's real rings
            are far too faint to see at this scale; rendering them was reading
            as "Jupiter looks like Saturn", which is the wrong thing to teach. */}
        {planet.hasRings && (planet.id === 'saturn' || planet.id === 'uranus') && (
          <ProceduralRings planet={planet} />
        )}
      </group>

      {/* Name label — outside tilt group so it stays upright.
          A real <button> so the planet is clickable and keyboard-reachable
          even though the mesh itself is a tiny moving target. */}
      {showLabel && (
        <Html
          position={[0, -(planet.visualRadius + 0.3), 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <button
            type="button"
            className="scene-label"
            aria-label={`Explore ${planet.name}`}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          >
            {planet.name}
          </button>
        </Html>
      )}
    </group>
  );
}

/**
 * Ring shader with an analytic planet shadow.
 *
 * The previous implementation used the renderer's shadow maps
 * (planet castShadow → ring receiveShadow). A 1024px point-light cube map
 * stretched over the whole system meant the thin ring spanned only a few
 * shadow texels at system-view distances, so entire rings randomly resolved
 * as "in shadow" and blinked out as the camera moved.
 *
 * Since the Sun is a known point at the origin and the planet is a sphere of
 * known radius at the ring's center, the shadow is computed analytically per
 * fragment instead: a ray-sphere test from the fragment toward the Sun.
 * Resolution-independent, never flickers, and gives a soft penumbra for free.
 */
const RING_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vCenter;

  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const RING_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uPlanetRadius;
  uniform vec3 uSunPos;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vCenter;

  void main() {
    vec4 tex = texture2D(uMap, vUv);

    // Ray-sphere occlusion: does the segment fragment→Sun pass through the planet?
    vec3 toSun = uSunPos - vWorldPos;
    float distToSun = length(toSun);
    vec3 dir = toSun / max(distToSun, 1e-6);
    vec3 toCenter = vCenter - vWorldPos;
    float t = dot(toCenter, dir);
    float lit = 1.0;
    if (t > 0.0 && t < distToSun) {
      float d = length(toCenter - dir * t);
      // Soft penumbra across the last ~15% of the planet radius
      lit = smoothstep(uPlanetRadius * 0.92, uPlanetRadius * 1.08, d);
    }

    // Shadowed ring keeps a little planetshine/ambient so it reads as shadow,
    // not a hole in the ring.
    float light = 0.3 + 0.7 * lit;
    gl_FragColor = vec4(tex.rgb * light, tex.a);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function ProceduralRings({ planet }: { planet: Planet }) {
  const ringTexture = useRingTexture(planet.id as 'saturn' | 'uranus');

  const innerMul = planet.id === 'saturn' ? 1.3 : 1.5;
  const outerMul = planet.id === 'saturn' ? 2.4 : 1.9;
  const innerR = planet.visualRadius * innerMul;
  const outerR = planet.visualRadius * outerMul;

  // Remap UVs so U goes radially from inner→outer edge (for 1D ring texture)
  const geometry = useMemo(() => {
    const geo = new RingGeometry(innerR, outerR, 128, 4);
    const uvs = geo.attributes.uv;
    const pos = geo.attributes.position;
    for (let i = 0; i < uvs.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      // Map distance to 0..1 range (inner→outer)
      uvs.setXY(i, (dist - innerR) / (outerR - innerR), 0.5);
    }
    uvs.needsUpdate = true;
    return geo;
  }, [innerR, outerR]);

  const uniforms = useMemo(() => ({
    uMap: { value: ringTexture },
    uPlanetRadius: { value: planet.visualRadius },
    uSunPos: { value: [0, 0, 0] },
  }), [ringTexture, planet.visualRadius]);

  return (
    <mesh rotation-x={Math.PI / 2} geometry={geometry}>
      <shaderMaterial
        vertexShader={RING_VERTEX_SHADER}
        fragmentShader={RING_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
