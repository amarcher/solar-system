import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { OrbitControls } from '@react-three/drei';
import type { NavigationState, Planet } from '../../types/celestialBody';
import { StarField } from './StarField';
import { SunMesh } from './Sun';
import { PlanetOrbit } from './PlanetOrbit';
import { AsteroidBelt } from './AsteroidBelt';
import { CameraRig } from './CameraRig';

interface SolarSystemSceneProps {
  planets: Planet[];
  nav: NavigationState;
  onPlanetClick: (planetId: string) => void;
  onSunClick: () => void;
}

export function SolarSystemScene({ planets, nav, onPlanetClick, onSunClick }: SolarSystemSceneProps) {
  const isSystemView = nav.level === 'system';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 35, 50], fov: 50, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false }}
        aria-hidden="true"
      >
        <color attach="background" args={['#050510']} />
        <ambientLight intensity={0.15} />
        <pointLight position={[0, 0, 0]} intensity={3} color="#ffd080" decay={0.5} />

        <StarField />
        <SunMesh onClick={onSunClick} />
        <AsteroidBelt />

        {planets.map((planet) => (
          <PlanetOrbit
            key={planet.id}
            planet={planet}
            onClick={() => onPlanetClick(planet.id)}
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
            intensity={1.2}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.4}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
