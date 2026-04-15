import { useMemo, useRef } from 'react';
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
import { useAstronomy } from '../../astronomy/AstronomyContext';

/**
 * Camera-relative fill light that activates when zoomed into a planet/moon.
 * Provides fill lighting when zoomed into a planet/moon.
 */
function FillLight({ active }: { active: boolean }) {
  const lightRef = useRef<DirectionalLight>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (lightRef.current && active) {
      // Position the fill light near the camera, offset slightly above and right
      lightRef.current.position.copy(camera.position);
      lightRef.current.position.y += 2;
      lightRef.current.position.x += 1;
    }
  });

  return (
    <directionalLight
      ref={lightRef}
      intensity={active ? 0.3 : 0}
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
  const isZoomedIn = nav.level === 'planet' || nav.level === 'moon' || nav.level === 'sun' || nav.level === 'mission';
  const focusedPlanetId = (nav.level === 'planet' || nav.level === 'moon') ? nav.planetId : null;
  const paused = nav.level === 'mission';

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
        shadows="percentage"
        camera={{ position: [0, 35, 50], fov: 50, near: 0.001, far: 600 }}
        gl={{ antialias: true, alpha: false, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.75 }}
        aria-hidden="true"
      >
        {mode !== 'sky' && (
          <>
            <ambientLight intensity={isZoomedIn ? 0.2 : 0.1} />
            <FillLight active={isZoomedIn} />
            <pointLight
              position={[0, 0, 0]}
              intensity={1.0}
              color="#fff8ee"
              decay={0}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
              shadow-camera-near={0.5}
              shadow-camera-far={60}
              shadow-bias={-0.001}
            />
          </>
        )}

        {mode === 'artistic' ? (
          <>
            <CelestialBackdrop />
            <SunMesh onClick={onSunClick} showLabel={showLabels && !isZoomedIn} paused={paused} />
            <AsteroidBelt paused={paused} />

            {planets.map((planet) => {
              const isFocused = focusedPlanetId === planet.id;
              const planetMissions = missionsByPlanet[planet.id];
              const planetHostsActiveMission = nav.level === 'mission'
                && planetMissions?.some((m) => m.id === nav.missionId);
              const visibleMissions = planetHostsActiveMission ? planetMissions : undefined;
              const showThisPlanetMoons = isFocused || !!planetHostsActiveMission;
              return (
                <PlanetOrbit
                  key={planet.id}
                  planet={planet}
                  moons={moonsByPlanet[planet.id] || []}
                  missions={visibleMissions}
                  onClick={() => onPlanetClick(planet.id)}
                  onMoonClick={(moonId) => onMoonClick(planet.id, moonId)}
                  paused={paused}
                  showLabel={showLabels && (!isZoomedIn || isFocused)}
                  showMoonLabels={showLabels && isFocused}
                  showMoons={showThisPlanetMoons}
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
            onSunClick={onSunClick}
            showLabels={showLabels}
            activeMission={orreryMission}
          />
        ) : (
          <SkyScene
            planets={planets}
            nav={nav}
            onPlanetClick={onPlanetClick}
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

        <EffectComposer>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.9}
            luminanceSmoothing={0.3}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
