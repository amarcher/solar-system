import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, ShaderMaterial } from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPosition;

  // Simple noise for surface turbulence
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float n = fbm(uv * 6.0 + uTime * 0.15);
    float n2 = fbm(uv * 10.0 - uTime * 0.1);

    // Sun colors — deep orange core fading to bright yellow
    vec3 core = vec3(1.0, 0.6, 0.1);
    vec3 mid = vec3(1.0, 0.85, 0.3);
    vec3 bright = vec3(1.0, 0.95, 0.8);

    vec3 color = mix(core, mid, n);
    color = mix(color, bright, n2 * 0.5);

    // Brighter at center (limb darkening)
    float dist = length(vPosition.xy);
    float limb = 1.0 - smoothstep(0.0, 1.5, dist);
    color *= 0.7 + limb * 0.3;

    gl_FragColor = vec4(color, 1.0);
  }
`;

interface SunMeshProps {
  onClick?: () => void;
}

export function SunMesh({ onClick }: SunMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} onClick={onClick}>
      <sphereGeometry args={[2.0, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
      {/* Outer glow sphere */}
      <mesh>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial
          color="#ffaa33"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>
    </mesh>
  );
}
