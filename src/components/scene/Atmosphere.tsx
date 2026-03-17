import { useMemo } from 'react';
import { BackSide, Color } from 'three';

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float fresnel = 1.0 - dot(vViewDir, vNormal);
    fresnel = clamp(fresnel, 0.0, 1.0);
    fresnel = pow(fresnel, uPower);

    gl_FragColor = vec4(uColor, fresnel * uIntensity);
  }
`;

interface AtmosphereProps {
  radius: number;
  color: string;
  intensity?: number;
  power?: number;
}

/**
 * Fresnel-based atmosphere glow rendered on the back face of a
 * slightly larger sphere. Gives a realistic limb-brightening effect.
 */
export function Atmosphere({
  radius,
  color,
  intensity = 0.7,
  power = 3.0,
}: AtmosphereProps) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uIntensity: { value: intensity },
      uPower: { value: power },
    }),
    [color, intensity, power],
  );

  return (
    <mesh>
      <sphereGeometry args={[radius * 1.12, 32, 32]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={BackSide}
      />
    </mesh>
  );
}
