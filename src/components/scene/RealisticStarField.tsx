import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, ShaderMaterial } from 'three';
import { loadStarCatalog, type StarCatalog } from '../../data/stars';
import { equatorialToCartesian, starAppearance } from '../../astronomy/celestialCoordinates';

function colorTempToRGB(temp: number): [number, number, number] {
  const t = temp / 100;
  let r: number, g: number, b: number;

  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }

  return [
    Math.max(0, Math.min(255, r)) / 255,
    Math.max(0, Math.min(255, g)) / 255,
    Math.max(0, Math.min(255, b)) / 255,
  ];
}

interface RealisticStarFieldProps {
  dimRef?: React.RefObject<number>;
  horizon?: boolean;
}

const vertexShader = /* glsl */ `
  attribute float size;
  attribute float brightness;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vBrightness;
  varying float vAltitude;
  void main() {
    vColor = color;
    vBrightness = brightness;
    vec3 worldDirection = mat3(modelMatrix) * position;
    vAltitude = normalize(worldDirection).y;
    gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * worldDirection, 1.0);
    gl_Position.z = gl_Position.w;
    gl_PointSize = size * uPixelRatio;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform bool uHorizon;
  varying vec3 vColor;
  varying float vBrightness;
  varying float vAltitude;
  void main() {
    if (uHorizon && vAltitude < 0.0) discard;
    float radius = length(gl_PointCoord - 0.5) * 2.0;
    if (radius >= 1.0) discard;
    float softness = exp(-3.0 * radius * radius) * (1.0 - smoothstep(0.65, 1.0, radius));
    gl_FragColor = vec4(vColor, softness * vBrightness * uOpacity);
    #include <colorspace_fragment>
  }
`;

export function RealisticStarField({ dimRef, horizon = false }: RealisticStarFieldProps = {}) {
  const [catalog, setCatalog] = useState<StarCatalog | null>(null);
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uOpacity: { value: 0.9 }, uPixelRatio: { value: 1 }, uHorizon: { value: horizon } }), [horizon]);

  useEffect(() => {
    let active = true;
    loadStarCatalog().then((value) => { if (active) setCatalog(value); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useFrame(({ gl }) => {
    if (!material.current) return;
    material.current.uniforms.uOpacity.value = 0.9 * (1 - (dimRef?.current ?? 0));
    material.current.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  const buffers = useMemo(() => {
    if (!catalog) return null;
    const positions = new Float32Array(catalog.stars.length * 3);
    const colors = new Float32Array(catalog.stars.length * 3);
    const sizes = new Float32Array(catalog.stars.length);
    const brightness = new Float32Array(catalog.stars.length);
    const color = new Color();
    catalog.stars.forEach(([ra, dec, mag, temperature], index) => {
      positions.set(equatorialToCartesian(ra, dec, 200), index * 3);
      color.setRGB(...colorTempToRGB(temperature)).convertSRGBToLinear().toArray(colors, index * 3);
      const appearance = starAppearance(mag);
      sizes[index] = appearance.size;
      brightness[index] = appearance.brightness;
    });
    return { positions, colors, sizes, brightness };
  }, [catalog]);

  if (!buffers) return null;
  return (
    <points frustumCulled={false} renderOrder={-90} raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[buffers.colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[buffers.sizes, 1]} />
        <bufferAttribute attach="attributes-brightness" args={[buffers.brightness, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader}
        vertexColors transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </points>
  );
}
