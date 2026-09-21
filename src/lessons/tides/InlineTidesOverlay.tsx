import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector2, Vector3, type BufferAttribute, type BufferGeometry, type Group, type ShaderMaterial } from 'three';
import { getPlanetById } from '../../data/planets';
import { getPlanetPosition, getMoonPosition } from '../../utils/planetPositions';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useAstronomy } from '../../astronomy/useAstronomy';
import { SOLAR_TIDE_RATIO, type TidesState } from './model';
import { addDifferentialField, gravityInDirection } from './inlineTidesMath';
import { shellVertex, shellFragment } from './waterShaders';
import { DEFAULT_WATER_PROFILE, inlineWaterProfile } from './waterProfiles';

const EARTH_VISUAL_RADIUS = getPlanetById('earth')!.visualRadius;
const POINT_COUNT = 12;
const MAX_VERTICES = POINT_COUNT * 2 * 6;
const MOON_COLOR = [0.35, 0.8, 1] as const;
const SUN_COLOR = [1, 0.73, 0.24] as const;
const DIFFERENCE_COLOR = [0.4, 0.93, 1] as const;
interface Props { state: TidesState; waterMotionPaused?: boolean }

/** World-space overlay only. The existing Earth, Moon, Sun and camera retain
 * ownership of their positions. phase is deliberately ignored in this live view. */
export function InlineTidesOverlay({ state, waterMotionPaused = false }: Props) {
  const { mode } = useAstronomy();
  const root = useRef<Group>(null);
  const water = useRef<ShaderMaterial>(null);
  const lineGeometry = useRef<BufferGeometry>(null);
  const positionAttribute = useRef<BufferAttribute>(null);
  const colorAttribute = useRef<BufferAttribute>(null);
  const clock = useRef(0);
  const reducedMotion = useReducedMotion();
  const positions = useMemo(() => new Float32Array(MAX_VERTICES * 3), []);
  const colors = useMemo(() => new Float32Array(MAX_VERTICES * 3), []);
  // Three caches the uniform container at program creation. Preserve it and
  // every value object across controls, position updates and pause changes.
  const uniforms = useMemo(() => ({
    waterTime: { value: 0 },
    opacityScale: { value: 0.6 },
    baseRadius: { value: DEFAULT_WATER_PROFILE.baseRadius },
    tidalAmplitude: { value: DEFAULT_WATER_PROFILE.tidalAmplitude },
    moonDirection: { value: new Vector3(1, 0, 0) },
    sunDirection: { value: new Vector3(1, 0, 0) },
    strengths: { value: new Vector2(1, 0) },
  }), []);
  const scratch = useMemo(() => ({
    axisV: new Vector3(), planeNormal: new Vector3(), surface: new Vector3(),
    field: new Vector3(), start: new Vector3(), end: new Vector3(),
    along: new Vector3(), across: new Vector3(), head: new Vector3(),
  }), []);

  useFrame((_, delta) => {
    const group = root.current;
    if (!group) return;
    const earthPosition = getPlanetPosition('earth');
    const moonPosition = getMoonPosition('moon');
    if (!earthPosition || !moonPosition) { group.visible = false; return; }
    const moonDirection = uniforms.moonDirection.value.copy(moonPosition).sub(earthPosition);
    // Both existing scene modes place the Sun at the origin.
    const sunDirection = uniforms.sunDirection.value.copy(earthPosition).negate();
    const moonDistanceSq = moonDirection.lengthSq(), sunDistanceSq = sunDirection.lengthSq();
    if (!Number.isFinite(moonDistanceSq) || !Number.isFinite(sunDistanceSq) || moonDistanceSq < 1e-12 || sunDistanceSq < 1e-12) {
      group.visible = false; return;
    }
    moonDirection.normalize();
    sunDirection.normalize();
    group.position.copy(earthPosition);
    group.visible = true;
    const lunarWeight = state.source === 'sun' ? 0 : 1;
    const solarWeight = state.source === 'moon' ? 0 : SOLAR_TIDE_RATIO;
    uniforms.strengths.value.set(lunarWeight, solarWeight);
    const profile = inlineWaterProfile(mode);
    if (state.step === 'water' && !waterMotionPaused && !reducedMotion) clock.current += Math.min(delta, 0.05);
    if (water.current) {
      water.current.uniforms.baseRadius.value = profile.baseRadius;
      water.current.uniforms.tidalAmplitude.value = profile.tidalAmplitude;
      water.current.uniforms.waterTime.value = clock.current;
      water.current.uniformsNeedUpdate = true;
    }
    if (state.step === 'water' || !positionAttribute.current || !colorAttribute.current || !lineGeometry.current) return;

    const { axisV, planeNormal, surface, field, start, end, along, across, head } = scratch;
    axisV.copy(sunDirection).addScaledVector(moonDirection, -sunDirection.dot(moonDirection));
    if (axisV.lengthSq() < 1e-8) {
      axisV.set(0, 1, 0);
      if (Math.abs(moonDirection.y) > 0.9) axisV.set(1, 0, 0);
      axisV.addScaledVector(moonDirection, -axisV.dot(moonDirection));
    }
    axisV.normalize();
    planeNormal.crossVectors(moonDirection, axisV).normalize();
    let offset = 0;
    const segment = (a: Vector3, b: Vector3, color: readonly number[]) => {
      a.toArray(positions, offset); b.toArray(positions, offset + 3);
      colors.set(color, offset); colors.set(color, offset + 3);
      offset += 6;
    };
    const arrow = (scale: number, color: readonly number[]) => {
      const length = field.length() * scale;
      if (length < 0.005) return;
      start.copy(surface).multiplyScalar(1.04);
      end.copy(start).addScaledVector(field, scale);
      along.copy(field).normalize();
      across.crossVectors(along, planeNormal).normalize();
      const h = Math.min(0.11, length * 0.35);
      segment(start, end, color);
      head.copy(end).addScaledVector(along, -h).addScaledVector(across, h * 0.55);
      segment(end, head, color);
      head.copy(end).addScaledVector(along, -h).addScaledVector(across, -h * 0.55);
      segment(end, head, color);
    };
    for (let i = 0; i < POINT_COUNT; i++) {
      const angle = i * Math.PI * 2 / POINT_COUNT;
      surface.copy(moonDirection).multiplyScalar(Math.cos(angle)).addScaledVector(axisV, Math.sin(angle));
      if (state.step === 'gravity') {
        if (lunarWeight) { gravityInDirection(field, surface, moonDirection, 'moon'); arrow(0.45, MOON_COLOR); }
        if (solarWeight) { gravityInDirection(field, surface, sunDirection, 'sun'); arrow(0.65, SUN_COLOR); }
      } else {
        field.set(0, 0, 0);
        addDifferentialField(field, surface, moonDirection, lunarWeight);
        addDifferentialField(field, surface, sunDirection, solarWeight);
        arrow(0.27, DIFFERENCE_COLOR);
      }
    }
    positionAttribute.current.needsUpdate = true;
    colorAttribute.current.needsUpdate = true;
    lineGeometry.current.setDrawRange(0, offset / 3);
  }, -1.75);

  return (
    <group ref={root} visible={false} scale={EARTH_VISUAL_RADIUS}>
      <mesh visible={state.step === 'water'} renderOrder={2} frustumCulled={false}>
        <sphereGeometry args={[1, 64, 40]} />
        <shaderMaterial ref={water} uniforms={uniforms} vertexShader={shellVertex} fragmentShader={shellFragment} transparent depthWrite={false} />
      </mesh>
      <lineSegments visible={state.step !== 'water'} renderOrder={3} frustumCulled={false}>
        <bufferGeometry ref={lineGeometry}>
          <bufferAttribute ref={positionAttribute} attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute ref={colorAttribute} attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors depthTest={false} depthWrite={false} />
      </lineSegments>
    </group>
  );
}
