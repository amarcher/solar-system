import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector2, Vector3, type Group, type ShaderMaterial } from 'three';
import { getPlanetById } from '../../data/planets';
import { getPlanetPosition, getMoonPosition } from '../../utils/planetPositions';
import { useAstronomy } from '../../astronomy/useAstronomy';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { SOLAR_TIDE_RATIO } from './model';
import { shellVertex, shellFragment } from './waterShaders';
import { DEFAULT_WATER_PROFILE, inlineWaterProfile } from './waterProfiles';

const EARTH_VISUAL_RADIUS = getPlanetById('earth')!.visualRadius;
/** Mounted only while enabled. Both physical contributions follow the existing
 * scene's live body directions without borrowing its camera or clock. */
export function InlineTidesOverlay() {
  const { mode } = useAstronomy();
  const root = useRef<Group>(null);
  const water = useRef<ShaderMaterial>(null);
  const clock = useRef(0);
  const reducedMotion = useReducedMotion();
  // Three caches the uniform container at program creation. Preserve it and
  // every value object across body motion and mode changes.
  const uniforms = useMemo(() => ({
    waterTime: { value: 0 },
    opacityScale: { value: 0.6 },
    baseRadius: { value: DEFAULT_WATER_PROFILE.baseRadius },
    tidalAmplitude: { value: DEFAULT_WATER_PROFILE.tidalAmplitude },
    moonDirection: { value: new Vector3(1, 0, 0) },
    sunDirection: { value: new Vector3(1, 0, 0) },
    strengths: { value: new Vector2(1, SOLAR_TIDE_RATIO) },
  }), []);
  useFrame((_, delta) => {
    const group = root.current;
    if (!group) return;
    const earthPosition = getPlanetPosition('earth');
    const moonPosition = getMoonPosition('moon');
    if (!earthPosition || !moonPosition) { group.visible = false; return; }
    const moonDirection = uniforms.moonDirection.value.copy(moonPosition).sub(earthPosition);
    const sunPosition = getPlanetPosition('sun');
    const sunDirection = uniforms.sunDirection.value;
    if (sunPosition) sunDirection.copy(sunPosition).sub(earthPosition);
    else sunDirection.copy(earthPosition).negate();
    const moonDistanceSq = moonDirection.lengthSq(), sunDistanceSq = sunDirection.lengthSq();
    if (!Number.isFinite(moonDistanceSq) || !Number.isFinite(sunDistanceSq) || moonDistanceSq < 1e-12 || sunDistanceSq < 1e-12) {
      group.visible = false; return;
    }
    moonDirection.normalize();
    sunDirection.normalize();
    group.position.copy(earthPosition);
    group.visible = true;
    const profile = inlineWaterProfile(mode);
    if (!reducedMotion) clock.current += Math.min(delta, 0.05);
    if (water.current) {
      water.current.uniforms.baseRadius.value = profile.baseRadius;
      water.current.uniforms.tidalAmplitude.value = profile.tidalAmplitude;
      water.current.uniforms.waterTime.value = clock.current;
      water.current.uniformsNeedUpdate = true;
    }
  }, -1.75);

  return (
    <group ref={root} visible={false} scale={EARTH_VISUAL_RADIUS}>
      <mesh renderOrder={2} frustumCulled={false}>
        <sphereGeometry args={[1, 64, 40]} />
        <shaderMaterial ref={water} uniforms={uniforms} vertexShader={shellVertex} fragmentShader={shellFragment} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
