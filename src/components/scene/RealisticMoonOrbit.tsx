import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3, type Group } from 'three';
import type { Moon } from '../../types/celestialBody';
import { useAstronomy } from '../../astronomy/AstronomyContext';
import { setMoonPosition } from '../../utils/planetPositions';

const TWO_PI = Math.PI * 2;

/**
 * Moon orbit radius in orrery scene units when zoomed into a planet.
 * We use a fixed visible scale since real moon distances are sub-pixel
 * at the orrery's planetary scale.
 */
function moonOrbitRadius(moon: Moon): number {
  // Space moons out based on their real distance ratio
  // Use the artistic orbitRadius as a reasonable visual spacing
  return moon.orbitRadius;
}

function moonVisualRadius(moon: Moon): number {
  return Math.max(0.04, Math.min(0.15, moon.diameter / 20000));
}

interface RealisticMoonOrbitProps {
  moon: Moon;
  showLabel?: boolean;
  onClick?: () => void;
}

/**
 * Renders a moon orbiting its parent planet using time-accurate positioning.
 * Uses the simulation time to compute orbital position from the moon's
 * real orbital period, so moons move at their correct relative speeds.
 */
export function RealisticMoonOrbit({ moon, showLabel = true, onClick }: RealisticMoonOrbitProps) {
  const groupRef = useRef<Group>(null);
  const worldPos = useRef(new Vector3());
  const { timeRef } = useAstronomy();

  const radius = moonOrbitRadius(moon);
  const visualRadius = moonVisualRadius(moon);
  const retrograde = moon.retrograde ? -1 : 1;

  useFrame(() => {
    if (!groupRef.current) return;

    const simTime = timeRef.current;
    // Compute orbital angle from simulation time.
    // Use J2000 epoch (2000-01-01T12:00:00Z) as reference.
    const j2000Ms = 946728000000;
    const elapsedDays = (simTime - j2000Ms) / 86_400_000;
    const orbitsCompleted = elapsedDays / moon.orbitalPeriod;
    const angle = (orbitsCompleted * TWO_PI * retrograde) % TWO_PI;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    groupRef.current.position.set(x, 0, z);

    groupRef.current.getWorldPosition(worldPos.current);
    setMoonPosition(moon.id, worldPos.current.x, worldPos.current.y, worldPos.current.z);
  });

  return (
    <>
      {/* Orbit ring */}
      <mesh rotation-x={Math.PI / 2}>
        <ringGeometry args={[radius - 0.015, radius + 0.015, 64]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      <group ref={groupRef}>
        <mesh
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = ''; }}
        >
          <sphereGeometry args={[visualRadius, 16, 16]} />
          <meshStandardMaterial
            color={moon.shape === 'irregular' ? '#888888' : '#aaaaaa'}
            roughness={0.8}
          />
        </mesh>

        {showLabel && (
          <Html
            center
            position={[0, -(visualRadius + 0.15), 0]}
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '10px',
              fontFamily: "'Space Grotesk', sans-serif",
              pointerEvents: 'none',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 6px rgba(0, 0, 0, 0.9)',
            }}
          >
            {moon.name}
          </Html>
        )}
      </group>
    </>
  );
}
