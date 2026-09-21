import { useMemo, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { ACESFilmicToneMapping, DirectionalLight } from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import type { Moon, NavigationState, Planet } from '../../types/celestialBody';
import type { Mission } from '../../types/mission';
import { CelestialBackdrop } from './CelestialBackdrop';
import { SunMesh } from './Sun';
import { PlanetOrbit } from './PlanetOrbit';
import { AsteroidBelt } from './AsteroidBelt';
import { CameraRig } from './CameraRig';
import { RealisticScene } from './RealisticScene';
import { SkyScene } from './SkyScene';
import { TerrestrialRig } from './TerrestrialRig';
import { useAstronomy } from '../../astronomy/useAstronomy';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { benchmarkEnabled } from '../../performance/benchmark';
import { useGraphicsQuality } from '../../performance/useGraphicsQuality';
import { QualityMonitor } from '../../performance/QualityMonitor';
import { SceneBenchmark } from '../../performance/SceneBenchmark';
import { getMoonPosition } from '../../utils/planetPositions';

/**
 * Camera-relative fill light that activates when zoomed into a planet/moon.
 * Provides fill lighting when zoomed into a planet/moon.
 */
function FillLight({ active, moonId }: { active: boolean; moonId?: string }) {
  const lightRef = useRef<DirectionalLight>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (lightRef.current && active) {
      // Position the fill light near the camera, offset slightly above and right
      lightRef.current.position.copy(camera.position);
      const moonPosition = moonId ? getMoonPosition(moonId) : null;
      if (moonPosition) {
        // Close-up illumination follows the observed surface, rather than
        // pointing back toward the Sun at the world's origin.
        lightRef.current.target.position.set(moonPosition.x, moonPosition.y, moonPosition.z);
      } else {
        lightRef.current.position.y += 2;
        lightRef.current.position.x += 1;
        lightRef.current.target.position.set(0, 0, 0);
      }
      lightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <directionalLight
      ref={lightRef}
      intensity={active ? (moonId ? 0.8 : 0.3) : 0}
      color="#ffffff"
    />
  );
}

interface SolarSystemSceneProps {
  planets: Planet[];
  moonsByPlanet: Record<string, Moon[]>;
  missions?: Mission[];
  nav: NavigationState;
  onPlanetClick: (planetId: string) => void;
  onMoonClick: (planetId: string, moonId: string) => void;
  onSunClick: () => void;
  showLabels?: boolean;
  deviceOrientation?: boolean;
  deviceHeadingRef?: React.RefObject<number | null>;
  devicePitchRef?: React.RefObject<number | null>;
  orreryMission?: Mission;
}

export function SolarSystemScene({ planets, moonsByPlanet, missions = [], nav, onPlanetClick, onMoonClick, onSunClick, showLabels = true, deviceOrientation, deviceHeadingRef, devicePitchRef, orreryMission }: SolarSystemSceneProps) {
  const { mode } = useAstronomy();
  const [benchmarkReport, setBenchmarkReport] = useState('Preparing benchmark…');
  const [benchmarkRun, setBenchmarkRun] = useState(0);
  const reducedMotion = useReducedMotion();
  const { settings } = useGraphicsQuality();
  const isZoomedIn = nav.level === 'planet' || nav.level === 'moon' || nav.level === 'sun' || nav.level === 'mission';
  // Planet and moon detail views keep the full system visible so kids can
  // orbit the camera around the focused body and understand its surroundings.
  // Sun and mission views retain their purpose-built isolated framing.
  const hidesSystemContext = nav.level === 'sun' || nav.level === 'mission';
  const focusedPlanetId = (nav.level === 'planet' || nav.level === 'moon') ? nav.planetId : null;
  const paused = nav.level === 'mission' || reducedMotion;

  // Group missions by their frame planet so each PlanetOrbit gets only its own.
  const missionsByPlanet = useMemo(() => {
    const map: Record<string, Mission[]> = {};
    for (const m of missions) {
      if (m.frame.kind === 'planet-local') {
        (map[m.frame.planetId] ??= []).push(m);
      }
    }
    return map;
  }, [missions]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <Canvas
        dpr={[1, settings.dpr]}
        camera={{ position: [0, 35, 50], fov: 50, near: 0.001, far: 600 }}
        gl={{ antialias: true, alpha: false, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.75 }}
        // Hide only the canvas itself from assistive tech — NOT the container,
        // which also hosts the <Html> label buttons that must stay reachable.
        onCreated={({ gl }) => gl.domElement.setAttribute('aria-hidden', 'true')}
      >
        <QualityMonitor />
        {benchmarkEnabled && <SceneBenchmark key={`${mode}:${JSON.stringify(nav)}:${benchmarkRun}`} scenario={`${mode}:${JSON.stringify(nav)}`} onReport={setBenchmarkReport} />}
        {/* No shadow maps: the only shadow in the scene (planet → rings) is
            computed analytically in the ring shader. See PlanetMesh.tsx. */}
        {mode !== 'sky' && (
          <>
            <ambientLight intensity={isZoomedIn ? 0.2 : 0.1} />
            <FillLight active={isZoomedIn} moonId={nav.level === 'moon' ? nav.moonId : undefined} />
            <pointLight
              position={[0, 0, 0]}
              intensity={1.0}
              color="#fff8ee"
              decay={0}
            />
          </>
        )}

        {mode === 'artistic' ? (
          <>
            <CelestialBackdrop />
            <group visible={!hidesSystemContext || nav.level === 'sun'}>
              <SunMesh
                onClick={hidesSystemContext && nav.level !== 'sun' ? undefined : onSunClick}
                showLabel={showLabels && !isZoomedIn}
                paused={paused}
              />
            </group>
            <group visible={!hidesSystemContext}>
              <AsteroidBelt paused={paused} />
            </group>

            {planets.map((planet) => {
              const isFocused = focusedPlanetId === planet.id;
              const planetMissions = missionsByPlanet[planet.id];
              const planetHostsActiveMission = nav.level === 'mission'
                && planetMissions?.some((m) => m.id === nav.missionId);
              const visibleMissions = planetHostsActiveMission ? planetMissions : undefined;
              const showThisPlanetMoons = isFocused || !!planetHostsActiveMission;
              const isVisible = !hidesSystemContext || isFocused || !!planetHostsActiveMission;
              return (
                <PlanetOrbit
                  key={planet.id}
                  planet={planet}
                  moons={moonsByPlanet[planet.id] || []}
                  missions={visibleMissions}
                  onClick={isVisible ? () => onPlanetClick(planet.id) : undefined}
                  onMoonClick={(moonId) => onMoonClick(planet.id, moonId)}
                  paused={paused}
                  showLabel={showLabels && (!isZoomedIn || isFocused)}
                  showMoonLabels={showLabels && isFocused}
                  showMoons={showThisPlanetMoons}
                  selectedMoonId={nav.level === 'moon' && isFocused ? nav.moonId : undefined}
                  visible={isVisible}
                />
              );
            })}
          </>
        ) : mode === 'orrery' ? (
          <RealisticScene
            planets={planets}
            moonsByPlanet={moonsByPlanet}
            nav={nav}
            onPlanetClick={onPlanetClick}
            onMoonClick={onMoonClick}
            onSunClick={onSunClick}
            showLabels={showLabels}
            activeMission={orreryMission}
          />
        ) : (
          <SkyScene
            planets={planets}
            nav={nav}
            onPlanetClick={onPlanetClick}
            onMoonClick={onMoonClick}
            onSunClick={onSunClick}
            showLabels={showLabels}
          />
        )}

        {mode === 'sky' ? (
          <TerrestrialRig
            deviceOrientation={deviceOrientation}
            headingRef={deviceHeadingRef}
            pitchRef={devicePitchRef}
          />
        ) : (
          <CameraRig nav={nav} planets={planets} orreryMissionId={orreryMission?.id} />
        )}

        {!reducedMotion && settings.bloom && (
          <EffectComposer>
            <Bloom
              intensity={1.2}
              luminanceThreshold={0.9}
              luminanceSmoothing={0.3}
              mipmapBlur
            />
          </EffectComposer>
        )}
      </Canvas>
      {benchmarkEnabled && (
        <aside style={{ position: 'fixed', right: 8, top: 8, zIndex: 10000, background: '#080d18ee', color: '#fff', padding: 12, maxHeight: '85vh', overflow: 'auto', width: 330, fontSize: 11 }} aria-label="Scene benchmark">
          <button type="button" onClick={() => setBenchmarkRun((n) => n + 1)}>Restart measurement</button>
          <pre data-testid="benchmark-report" style={{ whiteSpace: 'pre-wrap' }}>{benchmarkReport}</pre>
        </aside>
      )}
    </div>
  );
}
