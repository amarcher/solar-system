import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Mesh, ShaderMaterial } from 'three';

/* ── Sun surface shader ─────────────────────────────────────────────── */

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  /* ── Noise ─────────────────────────────────────────────────────────── */
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8); // rotate octaves for variety
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p = rot * p * 2.0;
      a *= 0.5;
    }
    return v;
  }

  /* ── Domain warping — makes the pattern more organic ──────────────── */
  float warpedFbm(vec2 p, float t) {
    vec2 q = vec2(
      fbm(p + vec2(0.0, 0.0) + t * 0.12),
      fbm(p + vec2(5.2, 1.3) - t * 0.08)
    );
    vec2 r = vec2(
      fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.06),
      fbm(p + 4.0 * q + vec2(8.3, 2.8) - t * 0.10)
    );
    return fbm(p + 4.0 * r);
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime;

    /* Primary surface pattern — domain-warped FBM */
    float n1 = warpedFbm(uv * 5.0, t);
    /* Secondary faster-moving detail layer */
    float n2 = fbm(uv * 12.0 + t * 0.2);

    /* Sunspot simulation — dark patches where noise dips low */
    float spotNoise = fbm(uv * 3.5 + t * 0.03);
    float spots = smoothstep(0.25, 0.35, spotNoise);

    /* Sun color palette */
    vec3 core      = vec3(1.0, 0.45, 0.05);  // deep orange-red
    vec3 mid       = vec3(1.0, 0.72, 0.18);  // amber
    vec3 bright    = vec3(1.0, 0.92, 0.65);  // pale yellow
    vec3 spotColor = vec3(0.7, 0.3, 0.05);   // dark orange for spots

    vec3 color = mix(core, mid, n1);
    color = mix(color, bright, n2 * 0.4);
    color = mix(spotColor, color, spots);

    /* Limb darkening — Eddington approximation */
    float cosTheta = dot(vViewDir, vNormal);
    float limb = 0.4 + 0.6 * cosTheta;
    color *= limb;

    /* Slight emissive boost at granule edges */
    float granule = fbm(uv * 20.0 + t * 0.15);
    color += vec3(1.0, 0.85, 0.5) * smoothstep(0.55, 0.65, granule) * 0.15;

    gl_FragColor = vec4(color, 1.0);
  }
`;

/* ── Component ──────────────────────────────────────────────────────── */

interface SunMeshProps {
  onClick?: () => void;
  showLabel?: boolean;
  paused?: boolean;
}

export function SunMesh({ onClick, showLabel = true, paused = false }: SunMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);

  const surfaceUniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  useFrame((_, delta) => {
    if (paused) return;
    if (matRef.current) matRef.current.uniforms.uTime.value += delta;
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group
      onClick={onClick}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      {/* Sun surface — Bloom post-processing creates the natural glow */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2.0, 64, 64]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={surfaceUniforms}
        />
      </mesh>

      {showLabel && (
        <Html
          position={[0, -2.5, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            style={{
              color: 'rgba(255, 215, 0, 0.8)',
              fontSize: '12px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              whiteSpace: 'nowrap',
              userSelect: 'none',
              textShadow: '0 1px 6px rgba(0, 0, 0, 0.9)',
              letterSpacing: '0.03em',
              cursor: 'pointer',
              pointerEvents: 'auto',
              padding: '4px 8px',
            }}
          >
            Sun
          </div>
        </Html>
      )}
    </group>
  );
}
