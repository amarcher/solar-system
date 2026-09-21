import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Group, Matrix4, ShaderMaterial } from 'three';
import { useAstronomy } from '../../astronomy/useAstronomy';
import { getCelestialRotation } from '../../astronomy/AstronomyService';
import { celestialRotationMatrix, type CelestialFrame } from '../../astronomy/celestialCoordinates';
import { useGraphicsQuality } from '../../performance/useGraphicsQuality';
import { useTexturePath } from '../../utils/textures';
import { RealisticStarField } from './RealisticStarField';
import { ConstellationLines } from './ConstellationLines';
import { celestialVertex, galaxyFragment } from './celestialShaders';

interface CelestialLayersProps {
  frame: CelestialFrame;
  showConstellations: boolean;
  showNames: boolean;
  dimRef?: React.RefObject<number>;
}

function MilkyWay({ dimRef, horizon }: { dimRef?: React.RefObject<number>; horizon: boolean }) {
  const { preference, settings } = useGraphicsQuality();
  const overview = useTexturePath('/textures/skybox/galaxy_milky_way_2k.jpg');
  const detail = useTexturePath(preference === 'detailed' && settings.skyWidth >= 4096
    ? '/textures/skybox/galaxy_milky_way_4k.jpg' : '');
  const texture = detail ?? overview;
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uMap: { value: texture }, uOpacity: { value: 0.3 }, uHorizon: { value: horizon } }), [texture, horizon]);
  useFrame(() => {
    if (material.current) material.current.uniforms.uOpacity.value = 0.3 * (1 - (dimRef?.current ?? 0));
  });
  if (!texture) return null;
  return (
    <mesh frustumCulled={false} renderOrder={-100} raycast={() => {}}>
      <sphereGeometry args={[200, 48, 24]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={celestialVertex} fragmentShader={galaxyFragment}
        side={BackSide} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** A common J2000 frame prevents drift between the image, stars and teaching lines. */
export function CelestialLayers({ frame, showConstellations, showNames, dimRef }: CelestialLayersProps) {
  const { engineReady, timeRef, observer } = useAstronomy();
  const group = useRef<Group>(null);
  const matrix = useMemo(() => new Matrix4(), []);
  const last = useRef({ time: NaN, latitude: NaN, longitude: NaN, elevation: NaN });
  useFrame(({ camera }) => {
    if (!group.current || !engineReady) return;
    // Geometry ignores translation in its shaders. Translation is still needed by HTML labels.
    group.current.position.copy(camera.position);
    const previous = last.current;
    const changed = observer.latitude !== previous.latitude || observer.longitude !== previous.longitude || observer.elevation !== previous.elevation;
    if (!Number.isFinite(previous.time) || changed || (frame === 'horizon' && Math.abs(timeRef.current - previous.time) >= 250)) {
      celestialRotationMatrix(getCelestialRotation(frame, new Date(timeRef.current), observer), frame, matrix);
      group.current.quaternion.setFromRotationMatrix(matrix);
      last.current = { time: timeRef.current, ...observer };
    }
    group.current.updateMatrixWorld(true);
  }, -1);
  return (
    <group ref={group} visible={engineReady}>
      <MilkyWay dimRef={dimRef} horizon={frame === 'horizon'} />
      <RealisticStarField dimRef={dimRef} horizon={frame === 'horizon'} />
      {showConstellations && <ConstellationLines showNames={showNames} dimRef={dimRef} horizon={frame === 'horizon'} />}
    </group>
  );
}
