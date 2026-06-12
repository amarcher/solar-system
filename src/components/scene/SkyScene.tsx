import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color } from 'three';
import type { Group } from 'three';
import { Html } from '@react-three/drei';
import type { NavigationState, Planet } from '../../types/celestialBody';
import { useAstronomy } from '../../astronomy/AstronomyContext';
import * as AstronomyService from '../../astronomy/AstronomyService';
import { RealisticStarField } from './RealisticStarField';
import { HorizonPlane } from './HorizonPlane';
import { ConstellationLines } from './ConstellationLines';
import { setPlanetPosition } from '../../utils/planetPositions';

const DEG2RAD = Math.PI / 180;
const SKY_RADIUS = 150;

/** Minimum recompute interval in ms of simulation time. */
const RECOMPUTE_THRESHOLD_MS = 2000;

// Sky background by sun altitude: full night below -12° (astronomical-ish
// twilight), full day above +5°.
const NIGHT_SKY = new Color('#050510');
const TWILIGHT_SKY = new Color('#243054');
const DAY_SKY = new Color('#7fb2e6');

interface SkySceneProps {
  planets: Planet[];
  nav: NavigationState;
  onPlanetClick: (planetId: string) => void;
  onMoonClick?: (planetId: string, moonId: string) => void;
  onSunClick?: () => void;
  showLabels: boolean;
}

/**
 * Convert altitude/azimuth to Cartesian position on the sky dome.
 * Azimuth: 0=N, 90=E, 180=S, 270=W (astronomy convention)
 * In our scene: +Z = North, +X = East
 */
function horizonToCartesian(altDeg: number, azDeg: number, radius: number): [number, number, number] {
  const alt = altDeg * DEG2RAD;
  const az = azDeg * DEG2RAD;
  const cosAlt = Math.cos(alt);
  return [
    radius * cosAlt * Math.sin(az),    // x = East
    radius * Math.sin(alt),             // y = Up
    -radius * cosAlt * Math.cos(az),    // z = -North (camera looks toward -z by default, but we want N = -z)
  ];
}

/**
 * Visual size for a body dot in the sky, based on visual magnitude.
 */
function magToSize(name: string): number {
  // Simplified — just make recognizable dots
  const sizes: Record<string, number> = {
    sun: 3.0, moon: 2.5,
    venus: 1.2, jupiter: 1.0, mars: 0.9, saturn: 0.8,
    mercury: 0.6, uranus: 0.4, neptune: 0.3,
  };
  return sizes[name] ?? 0.5;
}

function planetColor(id: string): string {
  const colors: Record<string, string> = {
    mercury: '#b0b0b0', venus: '#ffffc0', earth: '#4488ff',
    mars: '#ff6644', jupiter: '#ffcc88', saturn: '#ffddaa',
    uranus: '#88ddff', neptune: '#4466ff', pluto: '#ccbbaa',
    ceres: '#999999',
  };
  return colors[id] ?? '#ffffff';
}

const labelStyle = (color: string): React.CSSProperties => ({
  color,
  fontSize: '10px',
  fontFamily: "'Space Grotesk', sans-serif",
  pointerEvents: 'none',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  textShadow: '0 1px 6px rgba(0,0,0,0.9)',
});

export function SkyScene({ planets, onPlanetClick, onMoonClick, showLabels }: SkySceneProps) {
  const { timeRef, observer, engineReady } = useAstronomy();
  const { scene } = useThree();
  const starGroupRef = useRef<Group>(null);
  const lastComputedTime = useRef(0);

  // Refs for body meshes — positions update imperatively in useFrame
  const bodyRefs = useRef<Map<string, Group>>(new Map());
  const sunRef = useRef<Group>(null);
  const moonRef = useRef<Group>(null);

  // 0 = night, 1 = full day. Drives sky color and star/figure fading.
  const daylightRef = useRef(0);
  const skyColor = useRef(new Color().copy(NIGHT_SKY));

  // Which bodies are above the horizon — gates the HTML labels, which
  // (unlike the meshes) don't follow three.js visibility.
  const [aboveHorizon, setAboveHorizon] = useState<Set<string>>(() => new Set());

  // Own the scene background while sky mode is mounted.
  useEffect(() => {
    scene.background = skyColor.current;
    return () => { scene.background = null; };
  }, [scene]);

  useFrame(() => {
    if (!engineReady) return;

    const now = timeRef.current;
    const needsRecompute = Math.abs(now - lastComputedTime.current) > RECOMPUTE_THRESHOLD_MS;

    // Rotate star field by local sidereal time
    if (starGroupRef.current && needsRecompute) {
      try {
        const gmst = AstronomyService.getSiderealTime(new Date(now)); // hours
        const lst = gmst + observer.longitude / 15; // local sidereal time in hours
        // Rotate the celestial sphere: RA increases eastward, so we rotate
        // the star sphere by -LST around the polar axis (Y in our scene,
        // tilted by observer latitude).
        const lstRad = lst * (Math.PI / 12); // hours → radians

        // The star field is in equatorial coords. To show the correct sky:
        // 1. Rotate by -LST around the polar axis (hour angle)
        // 2. Tilt the polar axis by (90° - latitude) from vertical
        starGroupRef.current.rotation.set(0, 0, 0);
        // First tilt: rotate around X by -(90° - lat) to align pole with horizon
        starGroupRef.current.rotation.x = -(90 - observer.latitude) * DEG2RAD;
        // Then rotate around the (now-tilted) Y axis by LST
        starGroupRef.current.rotation.y = -lstRad;
      } catch { /* engine not ready */ }
    }

    // Update body positions in horizontal coords
    if (needsRecompute) {
      lastComputedTime.current = now;
      const date = new Date(now);
      const nextAbove = new Set<string>();

      // Sun — its altitude also drives the day/night sky
      if (sunRef.current) {
        try {
          const hor = AstronomyService.getHorizontalPosition('sun', date, observer);
          const [x, y, z] = horizonToCartesian(hor.altitude, hor.azimuth, SKY_RADIUS * 0.95);
          sunRef.current.position.set(x, y, z);
          sunRef.current.visible = hor.altitude > -2;
          if (sunRef.current.visible) nextAbove.add('sun');

          // Daylight: 0 below -12° sun altitude, 1 above +5°, smooth in between
          const t = Math.min(1, Math.max(0, (hor.altitude + 12) / 17));
          daylightRef.current = t * t * (3 - 2 * t);
        } catch { /* ignore */ }
      }

      // The Moon — the body kids look for first
      if (moonRef.current) {
        try {
          const hor = AstronomyService.getHorizontalPosition('moon', date, observer);
          const [x, y, z] = horizonToCartesian(hor.altitude, hor.azimuth, SKY_RADIUS * 0.93);
          moonRef.current.position.set(x, y, z);
          moonRef.current.visible = hor.altitude > -2;
          if (moonRef.current.visible) nextAbove.add('moon');
        } catch { /* ignore */ }
      }

      // Planets
      for (const planet of planets) {
        const ref = bodyRefs.current.get(planet.id);
        if (!ref) continue;
        try {
          const hor = AstronomyService.getHorizontalPosition(planet.id, date, observer);
          const [x, y, z] = horizonToCartesian(hor.altitude, hor.azimuth, SKY_RADIUS * 0.9);
          ref.position.set(x, y, z);
          setPlanetPosition(planet.id, x, y, z);
          // Hide if below horizon
          ref.visible = hor.altitude > -2;
          if (ref.visible) nextAbove.add(planet.id);
        } catch {
          ref.visible = false;
        }
      }

      setAboveHorizon((prev) => {
        if (prev.size === nextAbove.size && [...nextAbove].every((id) => prev.has(id))) {
          return prev;
        }
        return nextAbove;
      });
    }

    // Blend the sky color toward the current daylight level every frame
    const d = daylightRef.current;
    if (d < 0.5) {
      skyColor.current.lerpColors(NIGHT_SKY, TWILIGHT_SKY, d * 2);
    } else {
      skyColor.current.lerpColors(TWILIGHT_SKY, DAY_SKY, (d - 0.5) * 2);
    }
  });

  const setBodyRef = (id: string) => (el: Group | null) => {
    if (el) bodyRefs.current.set(id, el);
    else bodyRefs.current.delete(id);
  };

  return (
    <>
      {/* Stars + constellation figures — rotated by sidereal time + latitude,
          faded out by daylight */}
      <group ref={starGroupRef}>
        <RealisticStarField dimRef={daylightRef} />
        <ConstellationLines showNames={showLabels} dimRef={daylightRef} />
      </group>

      {/* Sun */}
      <group ref={sunRef}>
        <mesh>
          <sphereGeometry args={[3, 16, 16]} />
          <meshBasicMaterial color="#fff8dd" />
        </mesh>
        {/* Sun glow */}
        <mesh>
          <sphereGeometry args={[5, 16, 16]} />
          <meshBasicMaterial color="#ffdd88" transparent opacity={0.15} depthWrite={false} />
        </mesh>
        {showLabels && aboveHorizon.has('sun') && (
          <Html center position={[0, -5, 0]} style={labelStyle('#ffdd88')}>
            Sun
          </Html>
        )}
      </group>

      {/* The Moon */}
      <group ref={moonRef}>
        <mesh onClick={(e) => { e.stopPropagation(); onMoonClick?.('earth', 'moon'); }}>
          <sphereGeometry args={[magToSize('moon'), 16, 16]} />
          <meshBasicMaterial color="#d8d8d0" />
        </mesh>
        {showLabels && aboveHorizon.has('moon') && (
          <Html center position={[0, -(magToSize('moon') + 1.5), 0]} style={labelStyle('rgba(255,255,255,0.75)')}>
            The Moon
          </Html>
        )}
      </group>

      {/* Planets as colored dots on the sky dome */}
      {planets.map((planet) => (
        <group key={planet.id} ref={setBodyRef(planet.id)}>
          <mesh onClick={(e) => { e.stopPropagation(); onPlanetClick(planet.id); }}>
            <sphereGeometry args={[magToSize(planet.id), 12, 12]} />
            <meshBasicMaterial color={planetColor(planet.id)} />
          </mesh>
          {showLabels && aboveHorizon.has(planet.id) && (
            <Html center position={[0, -(magToSize(planet.id) + 1.5), 0]} style={labelStyle('rgba(255,255,255,0.7)')}>
              {planet.name}
            </Html>
          )}
        </group>
      ))}

      {/* Horizon + compass */}
      <HorizonPlane />

      {/* Ambient light — sky scene doesn't use sun-at-origin lighting */}
      <ambientLight intensity={0.3} />
    </>
  );
}
