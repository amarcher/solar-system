import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { Moon, NavigationState, Planet } from '../../types/celestialBody';
import type { Mission } from '../../types/mission';
import { SunMesh } from './Sun';
import { RealisticPlanet } from './RealisticPlanet';
import { RealisticStarField } from './RealisticStarField';
import { RealisticMissionTrajectory } from './RealisticMissionTrajectory';
import { useAstronomy } from '../../astronomy/AstronomyContext';
import * as AstronomyService from '../../astronomy/AstronomyService';
import { scaleAUVector } from '../../astronomy/realisticScale';
import { getPlanetPosition } from '../../utils/planetPositions';

interface RealisticSceneProps {
  planets: Planet[];
  moonsByPlanet: Record<string, Moon[]>;
  nav: NavigationState;
  onPlanetClick: (planetId: string) => void;
  onMoonClick: (planetId: string, moonId: string) => void;
  onSunClick: () => void;
  showLabels: boolean;
  activeMission?: Mission;
}

/**
 * Faint orbit path for one planet, sampled from the real ephemeris over a
 * full orbital period and log-compressed like the planet positions. Computed
 * once when the astronomy engine is ready — orbits don't change meaningfully
 * within a session.
 */
function OrbitPath({ planet }: { planet: Planet }) {
  const { engineReady } = useAstronomy();

  const positions = useMemo(() => {
    if (!engineReady) return null;
    try {
      const SAMPLES = 192;
      const periodMs = planet.orbitalPeriod * 86_400_000;
      const now = Date.now();
      const pts = new Float32Array(SAMPLES * 3);
      for (let i = 0; i < SAMPLES; i++) {
        const date = new Date(now + (periodMs * i) / SAMPLES);
        const helio = AstronomyService.getHeliocentricPosition(planet.id, date);
        const p = scaleAUVector(helio.x, helio.z, -helio.y);
        pts[i * 3] = p.x;
        pts[i * 3 + 1] = p.y;
        pts[i * 3 + 2] = p.z;
      }
      return pts;
    } catch {
      return null; // body not supported by the ephemeris
    }
  }, [engineReady, planet]);

  if (!positions) return null;

  return (
    <lineLoop>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.08} depthWrite={false} />
    </lineLoop>
  );
}

/** How close (in px) two labels may get before the lower-priority one hides. */
const LABEL_COLLISION_PX = 56;
/** How often the collision pass runs, in ms. */
const LABEL_PASS_INTERVAL_MS = 250;

/**
 * Screen-space label collision pass. Inner planets cluster around the Sun at
 * system zoom (and Saturn/Neptune genuinely conjunct in 2026), piling labels
 * on top of each other. Larger bodies win; hidden labels come back as soon as
 * the camera gives them room.
 */
function useLabelCollisions(planets: Planet[], enabled: boolean): Set<string> {
  const { camera, size } = useThree();
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const lastRun = useRef(0);
  const projected = useRef(new Vector3());

  useFrame(({ clock }) => {
    if (!enabled) return;
    const nowMs = clock.elapsedTime * 1000;
    if (nowMs - lastRun.current < LABEL_PASS_INTERVAL_MS) return;
    lastRun.current = nowMs;

    // Priority order: Sun first (always wins), then planets by visual size.
    const placed: { x: number; y: number }[] = [];
    const nextHidden = new Set<string>();

    const project = (x: number, y: number, z: number) => {
      const v = projected.current.set(x, y, z).project(camera);
      if (v.z > 1) return null; // behind the camera
      return {
        x: (v.x * 0.5 + 0.5) * size.width,
        y: (-v.y * 0.5 + 0.5) * size.height,
      };
    };

    const sunPt = project(0, 0, 0);
    if (sunPt) placed.push(sunPt);

    const byPriority = [...planets].sort((a, b) => b.visualRadius - a.visualRadius);
    for (const planet of byPriority) {
      const pos = getPlanetPosition(planet.id);
      if (!pos) continue;
      const pt = project(pos.x, pos.y, pos.z);
      if (!pt) continue;
      const collides = placed.some(
        (p) => Math.hypot(p.x - pt.x, p.y - pt.y) < LABEL_COLLISION_PX,
      );
      if (collides) {
        nextHidden.add(planet.id);
      } else {
        placed.push(pt);
      }
    }

    setHidden((prev) => {
      if (prev.size === nextHidden.size && [...nextHidden].every((id) => prev.has(id))) {
        return prev; // no change — avoid re-render
      }
      return nextHidden;
    });
  });

  return hidden;
}

export function RealisticScene({
  planets,
  moonsByPlanet,
  nav,
  onPlanetClick,
  onMoonClick,
  onSunClick,
  showLabels,
  activeMission,
}: RealisticSceneProps) {
  const isZoomedIn = nav.level === 'planet' || nav.level === 'moon' || nav.level === 'sun';
  const focusedPlanetId = (nav.level === 'planet' || nav.level === 'moon') ? nav.planetId : null;
  const collidingLabels = useLabelCollisions(planets, showLabels && !isZoomedIn);

  return (
    <>
      <RealisticStarField />
      <group visible={!isZoomedIn || nav.level === 'sun'}>
        <SunMesh
          onClick={isZoomedIn && nav.level !== 'sun' ? undefined : onSunClick}
          showLabel={showLabels && !isZoomedIn}
          paused={false}
        />
      </group>

      {/* Orbit paths give the orrery its structure — hidden while zoomed in */}
      <group visible={!isZoomedIn}>
        {planets.map((planet) => (
          <OrbitPath key={planet.id} planet={planet} />
        ))}
      </group>

      {planets.map((planet) => {
        const isFocused = focusedPlanetId === planet.id;
        // Hide Earth's moons when Artemis mission is active — it renders its own Moon
        const missionHidesMoons = activeMission?.frame.kind === 'planet-local'
          && activeMission.frame.planetId === planet.id;
        const isVisible = !isZoomedIn || isFocused;
        return (
          <group key={planet.id} visible={isVisible}>
            <RealisticPlanet
              planet={planet}
              moons={moonsByPlanet[planet.id] || []}
              onClick={isVisible ? () => onPlanetClick(planet.id) : undefined}
              onMoonClick={(moonId) => onMoonClick(planet.id, moonId)}
              showLabel={
                showLabels
                && (!isZoomedIn || isFocused)
                && !(collidingLabels.has(planet.id) && !isZoomedIn)
              }
              showMoons={isFocused && !missionHidesMoons}
              showMoonLabels={showLabels}
            />
          </group>
        );
      })}

      {activeMission && (
        <RealisticMissionTrajectory mission={activeMission} />
      )}
    </>
  );
}
