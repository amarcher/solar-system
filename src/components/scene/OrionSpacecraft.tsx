import { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Color, DoubleSide, Vector3 } from 'three';

interface OrionSpacecraftProps {
  /** Trail/accent color (matches mission color) */
  accentColor?: string;
}

/**
 * Real-Orion proportions for the primitive build (in scene units, total
 * stack ~0.022 long, wingspan ~0.030 with solar arrays):
 *
 *   Crew Module (CM): truncated cone, 5m base × 3.3m tall in real life.
 *     Apollo-style blunt heat shield at the wide end, narrower flat top
 *     with a small docking adapter.
 *   Service Module (SM): cylinder, 4m wide × 4.8m tall, with the main
 *     engine bell at the back and reaction control thrusters around the
 *     midline.
 *   Solar arrays: 4 deployable wings in an X pattern, each ~7m long.
 *     Subdivided into panels via a multi-segment box for visible grid.
 *
 * Coordinate convention: +Z is "forward" (direction of travel). The CM
 * points along +Z; the SM trails behind in −Z. Solar arrays extend
 * radially in the XY plane.
 */

const SCALE = 0.001; // 1 unit = 1 metre at this scale → total ~0.022 scene units

// Geometry constants in metres for readability
const CM_BASE_R = 2.5;     // 5m base diameter
const CM_TOP_R = 1.5;      // narrower top
const CM_HEIGHT = 3.3;
const HEAT_SHIELD_R = 2.55;
const HEAT_SHIELD_THK = 0.25;
const SM_R = 2.0;          // 4m diameter
const SM_HEIGHT = 4.8;
const ENGINE_BELL_R_TOP = 0.4;
const ENGINE_BELL_R_BOT = 0.95;
const ENGINE_BELL_HEIGHT = 1.4;
const ARRAY_INNER = 2.2;
const ARRAY_OUTER = 9.0;
const ARRAY_WIDTH = 2.6;
const ARRAY_THK = 0.08;

/**
 * Renders the Orion spacecraft. Tries to load the real NASA glTF model from
 * `public/models/orion.glb` (NASA's ESAS Crew Module from
 * github.com/nasa/NASA-3D-Resources, public domain). Falls back to a
 * detailed primitive build (CM + heat shield + SM + arrays + engine bell)
 * via Suspense if the file is missing or fails to load.
 *
 * To swap in a fancier model later, replace `public/models/orion.glb` with
 * any glTF/glb file. It'll be auto-scaled and centered.
 */
export function OrionSpacecraft({ accentColor = '#ff8a3d' }: OrionSpacecraftProps) {
  return (
    <Suspense fallback={<OrionPrimitives accentColor={accentColor} />}>
      <OrionFromGLTF accentColor={accentColor} />
    </Suspense>
  );
}

/**
 * Loads `public/models/orion.glb` (Sketchfab "Orion Spacecraft" by
 * wisemanmods, CC Attribution) — a complete Orion model with crew module,
 * service module, solar array wings, and engine bell. Auto-centers and
 * scales via bounding box so it occupies ~0.022 scene units regardless of
 * the GLB's native units.
 *
 * The model's natural orientation is unknown ahead of time. The
 * MissionTrajectory parent rotates the wrapper so its +Z axis points along
 * the velocity vector — if the GLB's "nose" lives on a different axis,
 * adjust `MODEL_ROTATION` below.
 */

const TARGET_LENGTH = 0.022; // scene units — desired total spacecraft length
// The Sketchfab "Orion Spacecraft" model has its nose along +Y in its local
// frame. Rotate +π/2 around X to swing +Y into +Z (the trajectory's forward
// direction expected by MissionTrajectory).
const MODEL_ROTATION: [number, number, number] = [Math.PI / 2, 0, 0];

function OrionFromGLTF(_props: OrionSpacecraftProps) {
  const { scene } = useGLTF('/models/orion.glb');

  // Clone so multiple instances don't share mutated transforms
  const cloned = useMemo(() => scene.clone(), [scene]);

  // Compute bounding box → derive uniform scale + centering offset
  const fit = useMemo(() => {
    const box = new Box3().setFromObject(cloned);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = TARGET_LENGTH / Math.max(maxDim, 1e-6);
    return { scale, center };
  }, [cloned]);

  return (
    <group rotation={MODEL_ROTATION}>
      <group scale={fit.scale}>
        <primitive
          object={cloned}
          position={[-fit.center.x, -fit.center.y, -fit.center.z]}
        />
      </group>
    </group>
  );
}

useGLTF.preload('/models/orion.glb');

function OrionPrimitives({ accentColor = '#ff8a3d' }: OrionSpacecraftProps) {
  const accent = useMemo(() => new Color(accentColor), [accentColor]);

  // Position SM behind CM along +Z axis (CM at front)
  const cmZ = (SM_HEIGHT / 2 + CM_HEIGHT / 2) * SCALE;
  const heatShieldZ = (SM_HEIGHT / 2 + HEAT_SHIELD_THK / 2) * SCALE;
  const engineZ = -(SM_HEIGHT / 2 + ENGINE_BELL_HEIGHT / 2) * SCALE;
  const arrayZ = 0; // arrays mounted at SM mid-height

  return (
    <group scale={SCALE}>
      {/* ─── Crew Module ─────────────────────────────────────────────── */}
      {/* Apollo-shaped truncated cone, white */}
      <mesh
        position={[0, 0, cmZ / SCALE]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[CM_TOP_R, CM_BASE_R, CM_HEIGHT, 24, 1]} />
        <meshStandardMaterial color="#ededed" roughness={0.45} metalness={0.15} />
      </mesh>

      {/* Heat shield — dark disk at the base of the CM */}
      <mesh
        position={[0, 0, heatShieldZ / SCALE]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[HEAT_SHIELD_R, HEAT_SHIELD_R, HEAT_SHIELD_THK, 24]} />
        <meshStandardMaterial color="#3a3530" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Docking adapter / forward bay cover — small disc on top of CM */}
      <mesh
        position={[0, 0, (cmZ / SCALE) + CM_HEIGHT / 2 + 0.15]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[1.0, 1.2, 0.3, 16]} />
        <meshStandardMaterial color="#c8c8c8" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Antenna mast — thin cylinder pointing forward */}
      <mesh
        position={[0, 0, (cmZ / SCALE) + CM_HEIGHT / 2 + 0.6]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
        <meshStandardMaterial color="#888" roughness={0.5} metalness={0.7} />
      </mesh>

      {/* ─── Service Module ───────────────────────────────────────────── */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[SM_R, SM_R, SM_HEIGHT, 24, 1]} />
        <meshStandardMaterial color="#aab1b8" roughness={0.55} metalness={0.55} />
      </mesh>

      {/* Lower SM band (visible structural ring) */}
      <mesh
        position={[0, 0, -SM_HEIGHT / 2 + 0.4]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[SM_R * 1.02, SM_R * 1.02, 0.4, 24]} />
        <meshStandardMaterial color="#7c8389" roughness={0.6} metalness={0.6} />
      </mesh>

      {/* Reaction Control thrusters — 4 small boxes around the SM midline */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh
            key={`rcs-${i}`}
            position={[Math.cos(a) * SM_R * 1.05, Math.sin(a) * SM_R * 1.05, -SM_HEIGHT / 4]}
          >
            <boxGeometry args={[0.4, 0.4, 0.6]} />
            <meshStandardMaterial color="#5a5e63" roughness={0.6} metalness={0.5} />
          </mesh>
        );
      })}

      {/* ─── Engine Bell ──────────────────────────────────────────────── */}
      <mesh
        position={[0, 0, engineZ / SCALE]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[ENGINE_BELL_R_TOP, ENGINE_BELL_R_BOT, ENGINE_BELL_HEIGHT, 20, 1, true]} />
        <meshStandardMaterial color="#9aa0a6" roughness={0.4} metalness={0.7} side={DoubleSide} />
      </mesh>

      {/* Engine glow — small emissive plume catches Bloom */}
      <mesh
        position={[0, 0, (engineZ / SCALE) - ENGINE_BELL_HEIGHT / 2 - 0.1]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <coneGeometry args={[ENGINE_BELL_R_BOT * 0.6, 0.5, 12]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>

      {/* ─── Solar Arrays (X pattern) ─────────────────────────────────── */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const midR = (ARRAY_INNER + ARRAY_OUTER) / 2;
        const arrayLen = ARRAY_OUTER - ARRAY_INNER;
        return (
          <group
            key={`arr-${i}`}
            position={[Math.cos(angle) * midR, Math.sin(angle) * midR, arrayZ / SCALE]}
            rotation={[0, 0, angle]}
          >
            {/* Panel — subdivided box for visible cell grid via segment count */}
            <mesh>
              <boxGeometry args={[arrayLen, ARRAY_WIDTH, ARRAY_THK, 6, 2, 1]} />
              <meshStandardMaterial
                color="#1a2f5e"
                emissive="#0a1530"
                emissiveIntensity={0.35}
                roughness={0.25}
                metalness={0.7}
              />
            </mesh>
            {/* Gold-toned frame around each panel */}
            <mesh>
              <boxGeometry args={[arrayLen + 0.1, ARRAY_WIDTH + 0.1, ARRAY_THK * 0.4]} />
              <meshStandardMaterial color="#9c7a35" roughness={0.4} metalness={0.85} />
            </mesh>
          </group>
        );
      })}

      {/* Solar array support booms — thin connectors from SM to inner panel edge */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh
            key={`boom-${i}`}
            position={[Math.cos(angle) * (SM_R + (ARRAY_INNER - SM_R) / 2), Math.sin(angle) * (SM_R + (ARRAY_INNER - SM_R) / 2), 0]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[ARRAY_INNER - SM_R, 0.2, 0.2]} />
            <meshStandardMaterial color="#bfbfbf" roughness={0.5} metalness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

