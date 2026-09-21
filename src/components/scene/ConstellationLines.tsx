import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3 } from 'three';
import type { Group, ShaderMaterial } from 'three';
import { equatorialToCartesian } from '../../astronomy/celestialCoordinates';
import { celestialVertex, constellationFragment } from './celestialShaders';
import { loadConstellations, type Constellation } from '../../data/constellations';

// This radius also anchors the optional HTML labels; shaders project at infinity.
const SPHERE_RADIUS = 196;
/** Show name labels only for the most prominent constellations. */
const LABEL_RANK = 1;
/** How often label horizon visibility recomputes, in ms. */
const LABEL_INTERVAL_MS = 1000;

/**
 * Constellation stick figures on the celestial sphere. Rendered inside the
 * shared J2000 group, so figures stay glued to the stars in both realistic modes.
 * Name labels appear for the most prominent constellations and hide while a
 * figure's center is below the horizon.
 */
interface ConstellationLinesProps {
  showNames: boolean;
  horizon?: boolean;
  /** 0 = night (full visibility), 1 = day (figures fade out with the stars). */
  dimRef?: React.RefObject<number>;
}

const BASE_LINE_OPACITY = 0.28;

export function ConstellationLines({ showNames, dimRef, horizon = false }: ConstellationLinesProps) {
  const [constellations, setConstellations] = useState<Constellation[] | null>(null);
  const groupRef = useRef<Group>(null);
  const lineMaterialRef = useRef<ShaderMaterial>(null);
  const [labelsAboveHorizon, setLabelsAboveHorizon] = useState<Set<string>>(() => new Set());
  const lastLabelPass = useRef(-Infinity);
  const uniforms = useMemo(() => ({ uOpacity: { value: BASE_LINE_OPACITY }, uHorizon: { value: horizon } }), [horizon]);
  const scratch = useRef(new Vector3());

  useEffect(() => {
    let cancelled = false;
    loadConstellations().then((data) => { if (!cancelled) setConstellations(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Merge every figure into one LineSegments buffer (one draw call).
  const positions = useMemo(() => {
    if (!constellations) return null;
    const segments: number[] = [];
    for (const con of constellations) {
      for (const line of con.lines) {
        for (let i = 0; i < line.length - 1; i++) {
          const a = equatorialToCartesian(line[i][0], line[i][1], SPHERE_RADIUS);
          const b = equatorialToCartesian(line[i + 1][0], line[i + 1][1], SPHERE_RADIUS);
          segments.push(...a, ...b);
        }
      }
    }
    return new Float32Array(segments);
  }, [constellations]);

  const labeled = useMemo(
    () => (constellations ?? []).filter((c) => c.rank <= LABEL_RANK),
    [constellations],
  );

  // In Sky, hide names below the observer's horizon or during daylight.
  useFrame(({ clock, camera }) => {
    if (dimRef && lineMaterialRef.current) {
      lineMaterialRef.current.uniforms.uOpacity.value = BASE_LINE_OPACITY * (1 - dimRef.current);
    }
    if (!groupRef.current || labeled.length === 0) return;
    const nowMs = clock.elapsedTime * 1000;
    if (nowMs - lastLabelPass.current < LABEL_INTERVAL_MS) return;
    lastLabelPass.current = nowMs;

    const next = new Set<string>();
    for (const con of labeled) {
      const [x, y, z] = equatorialToCartesian(con.center[0], con.center[1], SPHERE_RADIUS);
      scratch.current.set(x, y, z).applyMatrix4(groupRef.current.matrixWorld);
      const daytime = (dimRef?.current ?? 0) > 0.6;
      if ((!horizon || scratch.current.y - camera.position.y > 8) && !daytime) next.add(con.id); // comfortably above horizon, not daytime
    }
    setLabelsAboveHorizon((prev) => {
      if (prev.size === next.size && [...next].every((id) => prev.has(id))) return prev;
      return next;
    });
  });

  if (!positions) return null;

  return (
    <group ref={groupRef}>
      <lineSegments frustumCulled={false} renderOrder={-80} raycast={() => {}}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <shaderMaterial ref={lineMaterialRef} uniforms={uniforms} vertexShader={celestialVertex} fragmentShader={constellationFragment} transparent depthWrite={false} toneMapped={false} />
      </lineSegments>

      {showNames && labeled.map((con) => {
        if (!labelsAboveHorizon.has(con.id)) return null;
        const pos = equatorialToCartesian(con.center[0], con.center[1], SPHERE_RADIUS);
        return (
          <Html
            key={`${con.id}-${con.center[0].toFixed(1)}`}
            position={pos}
            center
            style={{
              color: 'rgba(150, 180, 255, 0.55)',
              fontSize: '11px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontStyle: 'italic',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              userSelect: 'none',
              textShadow: '0 1px 8px rgba(0, 0, 0, 0.9)',
            }}
          >
            {con.name}
          </Html>
        );
      })}
    </group>
  );
}
