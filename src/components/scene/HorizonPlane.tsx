import { DoubleSide } from 'three';
import { Html } from '@react-three/drei';

const RADIUS = 180;
const DIRECTIONS = [
  { label: 'N', angle: 0 },
  { label: 'E', angle: Math.PI / 2 },
  { label: 'S', angle: Math.PI },
  { label: 'W', angle: 3 * Math.PI / 2 },
] as const;

/**
 * A faint ground plane at y=0 with compass directions.
 * Helps the user orient when looking at the terrestrial sky.
 */
export function HorizonPlane() {
  return (
    <group>
      {/* Ground plane — very faint disc */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.1}>
        <circleGeometry args={[RADIUS, 64]} />
        <meshBasicMaterial
          color="#0a1020"
          transparent
          opacity={0.85}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Horizon glow ring */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.05}>
        <ringGeometry args={[RADIUS - 2, RADIUS, 128]} />
        <meshBasicMaterial
          color="#1a3050"
          transparent
          opacity={0.4}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Compass labels */}
      {DIRECTIONS.map(({ label, angle }) => {
        const dist = RADIUS * 0.85;
        const x = Math.sin(angle) * dist;
        const z = -Math.cos(angle) * dist;
        return (
          <Html
            key={label}
            position={[x, 0.5, z]}
            center
            style={{
              color: label === 'N' ? 'rgba(255, 100, 100, 0.8)' : 'rgba(255, 255, 255, 0.5)',
              fontSize: label === 'N' ? '14px' : '12px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: label === 'N' ? '700' : '500',
              pointerEvents: 'none',
              userSelect: 'none',
              textShadow: '0 1px 8px rgba(0, 0, 0, 0.9)',
              letterSpacing: '0.1em',
            }}
          >
            {label}
          </Html>
        );
      })}
    </group>
  );
}
