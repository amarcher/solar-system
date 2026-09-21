import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { DoubleSide, Vector2, Vector3, type ShaderMaterial } from 'three';
import { usePlanetTexture } from '../../utils/textures';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { bodyDirection, differentialField, gravityField, selectedBodies, SOLAR_TIDE_RATIO, type TidesState, type Vec3 } from './model';

// Decorative capillary-like ripples sit on top of the unchanged equilibrium tide.
// They do not rotate its bulges or model ocean currents or tidal friction.
const rippleFunctions = `
  uniform float waterTime;
  float waveA(vec3 n) { return dot(n, vec3(0.81, 0.32, 0.49)) * 38.0 + waterTime * 0.75; }
  float waveB(vec3 n) { return dot(n, vec3(-0.28, 0.91, 0.30)) * 51.0 - waterTime * 0.58; }
  float ripple(vec3 n) { return 0.62 * sin(waveA(n)) + 0.38 * sin(waveB(n)); }
  vec3 rippleGradient(vec3 n) {
    return 0.62 * 38.0 * cos(waveA(n)) * vec3(0.81, 0.32, 0.49)
         + 0.38 * 51.0 * cos(waveB(n)) * vec3(-0.28, 0.91, 0.30);
  }
`;
const shellVertex = `
  uniform vec3 moonDirection;
  uniform vec2 strengths;
  varying vec3 surfaceNormal;
  varying vec3 surfaceDirection;
  varying vec3 eyeDirection;
  ${rippleFunctions}
  void main() {
    vec3 n = normalize(position);
    float m = dot(n, moonDirection);
    float s = n.x;
    float potential = strengths.x * (3.0*m*m-1.0)/2.0 + strengths.y * (3.0*s*s-1.0)/2.0;
    // P2 still owns the large bulges. Wave displacement is at most 0.004 Earth radii.
    float radius = max(1.01, 1.18 + 0.22 * potential + 0.004 * ripple(n));
    vec3 gradient = 0.22 * 3.0 * (strengths.x * m * moonDirection + strengths.y * s * vec3(1.0, 0.0, 0.0))
                  + 0.004 * rippleGradient(n);
    vec3 tangentGradient = gradient - n * dot(n, gradient);
    vec3 displaced = n * radius;
    surfaceNormal = normalize(normalMatrix * normalize(n - tangentGradient / radius));
    surfaceDirection = n;
    vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
    eyeDirection = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;
const shellFragment = `
  varying vec3 surfaceNormal;
  varying vec3 surfaceDirection;
  varying vec3 eyeDirection;
  ${rippleFunctions}
  void main() {
    vec3 n = normalize(surfaceDirection);
    vec3 normal = normalize(surfaceNormal);
    vec3 view = normalize(eyeDirection);
    float rim = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 2.2);
    // Thin intersecting highlights suggest rippling water without an opaque blue coating.
    float ribbons = pow(0.5 + 0.5 * sin(waveA(n) + 1.2 * sin(waveB(n))), 10.0);
    float fineWave = dot(n, vec3(0.42, -0.36, 0.83)) * 83.0 + waterTime * 0.46;
    float fine = pow(0.5 + 0.5 * sin(fineWave + 1.4 * ripple(n)), 14.0);
    float highlights = ribbons * 0.7 + fine * 0.3;
    vec3 color = mix(vec3(0.08, 0.35, 0.58), vec3(0.53, 0.86, 1.0), rim);
    color = mix(color, vec3(0.83, 0.96, 1.0), highlights * (0.28 + 0.45 * rim));
    float alpha = 0.10 + 0.46 * rim + 0.15 * highlights;
    gl_FragColor = vec4(color, alpha);
  }
`;
function makeArrows(state: TidesState) {
  const positions: number[] = [];
  const colors: number[] = [];
  const append = (from: Vec3, to: Vec3, color: Vec3) => {
    positions.push(...from, ...to); colors.push(...color, ...color);
  };
  const arrow = (r: Vec3, field: Vec3, scale: number, color: Vec3) => {
    const x = field[0] * scale, y = field[1] * scale;
    const length = Math.hypot(x, y);
    if (length < 0.005) return;
    const start: Vec3 = [r[0], r[1], 1.08];
    const end: Vec3 = [r[0] + x, r[1] + y, 1.08];
    append(start, end, color);
    const h = Math.min(0.11, length * 0.35), ux = x / length, uy = y / length;
    append(end, [end[0] - h * ux + h * 0.55 * uy, end[1] - h * uy - h * 0.55 * ux, end[2]], color);
    append(end, [end[0] - h * ux - h * 0.55 * uy, end[1] - h * uy + h * 0.55 * ux, end[2]], color);
  };
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    const r: Vec3 = [Math.cos(angle), Math.sin(angle), 0];
    if (state.step === 'gravity') {
      for (const body of selectedBodies(state.source)) arrow(r, gravityField(r, body, state.phase), body === 'sun' ? 0.65 : 0.45, body === 'moon' ? [0.35, 0.8, 1] : [1, 0.73, 0.24]);
    } else arrow(r, differentialField(r, state), 0.27, [0.4, 0.93, 1]);
  }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors) };
}
/** Mounted only during a lesson: no animation loop or lesson resources while off. */
export function TidesScene({ state, waterMotionPaused = false }: { state: TidesState; waterMotionPaused?: boolean }) {
  const reducedMotion = useReducedMotion();
  const rippleClock = useRef(0);
  const waterMaterial = useRef<ShaderMaterial>(null);
  const earth = usePlanetTexture('earth', { maxWidth: 2048 });
  const moon = usePlanetTexture('moon', { maxWidth: 2048 });
  useFrame((_, delta) => {
    if (state.step === 'water' && !waterMotionPaused && !reducedMotion) rippleClock.current += Math.min(delta, 0.05);
    const material = waterMaterial.current;
    if (material) {
      material.uniforms.waterTime.value = rippleClock.current;
      material.uniforms.moonDirection.value.set(...bodyDirection('moon', state.phase));
      material.uniforms.strengths.value.set(state.source === 'sun' ? 0 : 1, state.source === 'moon' ? 0 : SOLAR_TIDE_RATIO);
      material.uniformsNeedUpdate = true;
    }
  });
  const direction = bodyDirection('moon', state.phase);
  // Three caches this object when linking the program; mutate its values rather
  // than replacing it when a learner changes the Moon or Sun controls.
  const uniforms = useMemo(() => ({
    waterTime: { value: 0 },
    moonDirection: { value: new Vector3(1, 0, 0) },
    strengths: { value: new Vector2(1, 0) },
  }), []);
  const arrows = useMemo(() => makeArrows(state), [state]);
  return (
    <group>
      <mesh><sphereGeometry args={[100, 16, 8]} /><meshBasicMaterial color="#050d1c" side={DoubleSide} /></mesh>
      <ambientLight intensity={1.6} />
      <directionalLight position={[5, 1, 7]} intensity={2} />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial map={earth} color={earth ? '#ffffff' : '#2774b4'} roughness={1} />
      </mesh>
      {state.step === 'water' && <mesh renderOrder={2}>
        <sphereGeometry args={[1, 64, 40]} />
        <shaderMaterial ref={waterMaterial} vertexShader={shellVertex} fragmentShader={shellFragment} uniforms={uniforms} transparent depthWrite={false} />
      </mesh>}
      {state.step !== 'water' && <lineSegments renderOrder={3}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[arrows.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[arrows.colors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors depthTest={false} />
      </lineSegments>}
      <mesh position={[direction[0] * 2.35, direction[1] * 2.35, 0]}>
        <sphereGeometry args={[0.22, 24, 16]} />
        <meshStandardMaterial map={moon} color="#dddde3" />
        <Html position={[0, -0.35, 0]} center style={{ pointerEvents: 'none', color: '#cde9ff', fontSize: 12 }}><span aria-hidden="true">Moon</span></Html>
      </mesh>
      <mesh position={[3.05, 0, 0]}>
        <sphereGeometry args={[0.25, 24, 16]} /><meshBasicMaterial color="#ffc966" />
        <Html position={[-0.15, -0.8, 0]} center style={{ pointerEvents: 'none', color: '#ffde98', fontSize: 12, whiteSpace: 'nowrap' }}><span aria-hidden="true">Sun direction</span></Html>
      </mesh>
    </group>
  );
}
