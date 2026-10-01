import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute, ShaderMaterial, Color, Group } from 'three';
import { useAstronomy } from '../../astronomy/useAstronomy';
import { useGraphicsQuality } from '../../performance/useGraphicsQuality';
import { useFocusedSpace } from '../../sceneLayout/useFocusedSpace';
import { beltRadius, beltRadiansPerDay, createBeltSamples, DEBRIS_BELTS, type BeltId } from '../../sceneLayout/debrisBelts';
import './SceneLabels.css';

const vertexShader = `
attribute vec4 orbit;
attribute vec3 appearance;
uniform float days;
uniform float pixelRatio;
varying float brightness;
void main() {
  float a = orbit.y + days * appearance.x;
  float c = cos(a), s = sin(a), n = orbit.w, i = orbit.z;
  // Ecliptic north is +Y; +Z points toward negative ecliptic longitude.
  vec3 p = orbit.x * vec3(cos(n)*c-sin(n)*s*cos(i), s*sin(i), -sin(n)*c-cos(n)*s*cos(i));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = pixelRatio * appearance.y * clamp(55.0 / max(1.0, -mv.z), 2.0, 5.0);
  brightness = appearance.z;
}`;
const fragmentShader = `
uniform vec3 tint;
varying float brightness;
void main() {
  float r = length(gl_PointCoord - vec2(0.5));
  if (r > 0.5) discard;
  gl_FragColor = vec4(tint * brightness, (1.0-smoothstep(0.22,0.5,r))*0.9);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function Belt({ id, paused, showLabels }: { id: BeltId; paused: boolean; showLabels: boolean }) {
  const { mode, timeRef, dateRevision } = useAstronomy();
  const { tier } = useGraphicsQuality();
  const space = useFocusedSpace();
  const group = useRef<Group>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const days = useRef<number | null>(null);
  useEffect(() => { days.current = null; }, [dateRevision]);
  const realistic = mode === 'orrery';
  const belt = DEBRIS_BELTS[id];
  const geometry = useMemo(() => {
    const samples = createBeltSamples(id);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(samples.length * 3), 3));
    geo.setAttribute('orbit', new Float32BufferAttribute(samples.flatMap(s => [beltRadius(id, s.au, realistic), s.phase, s.inclination, s.node]), 4));
    geo.setAttribute('appearance', new Float32BufferAttribute(samples.flatMap(s => [beltRadiansPerDay(s.au), s.size, 0.65 + s.size * 0.25]), 3));
    return geo;
  }, [id, realistic]);
  const material = useMemo(() => new ShaderMaterial({
    uniforms: { days: { value: 0 }, pixelRatio: { value: 1 }, tint: { value: new Color(belt.color) } },
    vertexShader, fragmentShader, transparent: true, depthWrite: false,
  }), [belt.color]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => { geometry.setDrawRange(0, tier === 'low' ? Math.floor(belt.count * 0.45) : belt.count); }, [geometry, tier, belt.count]);
  useFrame(({ gl }, delta) => {
    if (days.current === null) days.current = (timeRef.current - 946728000000) / 86400000;
    if (!paused) days.current = realistic ? (timeRef.current - 946728000000) / 86400000 : days.current + delta * 12;
    if (materialRef.current) {
      materialRef.current.uniforms.days.value = days.current;
      materialRef.current.uniforms.pixelRatio.value = gl.getPixelRatio();
    }
    if (group.current) {
      group.current.position.copy(space.offset);
      group.current.scale.setScalar(space.scale);
    }
  }, -2);
  const r = beltRadius(id, (belt.innerAU + belt.outerAU) / 2, realistic);
  return <group ref={group}>
    <points geometry={geometry} frustumCulled={false} raycast={() => {}}>
      <primitive object={material} ref={materialRef} attach="material" />
    </points>
    {showLabels && <Html center position={[id === 'asteroid' ? -r * 0.8 : r * 0.75, 0.25, r * (id === 'asteroid' ? 0.6 : -0.66)]} style={{ pointerEvents: 'none' }}>
      <span className={`scene-label scene-label--belt scene-label--belt-${id}`}>{belt.name}<small>Objects enlarged</small></span>
    </Html>}
  </group>;
}

export function DebrisBelts({ paused = false, showLabels = true }: { paused?: boolean; showLabels?: boolean }) {
  return <><Belt id="asteroid" paused={paused} showLabels={showLabels} /><Belt id="kuiper" paused={paused} showLabels={showLabels} /></>;
}
