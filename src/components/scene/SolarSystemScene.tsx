import { useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { NoToneMapping, DirectionalLight } from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { OrbitControls } from '@react-three/drei';
import type { Moon, NavigationState, Planet } from '../../types/celestialBody';
import { StarField } from './StarField';
import { SunMesh } from './Sun';
import { PlanetOrbit } from './PlanetOrbit';
import { AsteroidBelt } from './AsteroidBelt';
import { CameraRig } from './CameraRig';

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
      intensity={active ? 1.0 : 0}
      color="#ffffff"
    />
  );
}

interface SolarSystemSceneProps {
  planets: Planet[];
  moonsByPlanet: Record<string, Moon[]>;
  nav: NavigationState;
  onPlanetClick: (planetId: string) => void;
  onMoonClick: (planetId: string, moonId: string) => void;
  onSunClick: () => void;
  showLabels?: boolean;
}

export function SolarSystemScene({ planets, moonsByPlanet, nav, onPlanetClick, onMoonClick, onSunClick, showLabels = true }: SolarSystemSceneProps) {
  const isSystemView = nav.level === 'system';
  const isZoomedIn = nav.level === 'planet' || nav.level === 'moon' || nav.level === 'sun';
  const focusedPlanetId = (nav.level === 'planet' || nav.level === 'moon') ? nav.planetId : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <Canvas
        shadows
        camera={{ position: [0, 35, 50], fov: 50, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false, toneMapping: NoToneMapping }}
        aria-hidden="true"
      >
        <color attach="background" args={['#050510']} />
        <ambientLight intensity={isZoomedIn ? 0.25 : 0.15} />
        <FillLight active={isZoomedIn} />
        <pointLight
          position={[0, 0, 0]}
          intensity={8}
          color="#fff8ee"
          decay={0}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={60}
          shadow-bias={-0.001}
        />

        <StarField />
        <SunMesh onClick={onSunClick} showLabel={showLabels} />
        <AsteroidBelt />

        {planets.map((planet) => (
          <PlanetOrbit
            key={planet.id}
            planet={planet}
            moons={moonsByPlanet[planet.id] || []}
            onClick={() => onPlanetClick(planet.id)}
            onMoonClick={(moonId) => onMoonClick(planet.id, moonId)}
            showLabel={showLabels}
            showMoons={focusedPlanetId === planet.id}
          />
        ))}

        <CameraRig nav={nav} planets={planets} />

        {isSystemView && (
          <OrbitControls
            enablePan={false}
            minDistance={15}
            maxDistance={100}
            maxPolarAngle={Math.PI * 0.85}
          />
        )}

        <EffectComposer>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.5}
            luminanceSmoothing={0.3}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
