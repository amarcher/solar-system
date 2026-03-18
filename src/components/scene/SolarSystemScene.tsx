import { Canvas } from '@react-three/fiber';
import { NoToneMapping } from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { OrbitControls } from '@react-three/drei';
import type { Moon, NavigationState, Planet } from '../../types/celestialBody';
import { StarField } from './StarField';
import { SunMesh } from './Sun';
import { PlanetOrbit } from './PlanetOrbit';
import { AsteroidBelt } from './AsteroidBelt';
import { CameraRig } from './CameraRig';

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
        <ambientLight intensity={0.15} />
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
        <SunMesh onClick={onSunClick} />
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
