import { useMemo } from 'react';
import { Environment } from '@react-three/drei';

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/** Immersive space backdrop using a Milky Way panorama. Uses 2K on mobile to avoid memory crashes. */
export function CelestialBackdrop() {
  const texturePath = useMemo(
    () => isMobile
      ? '/textures/skybox/stars_milky_way_2k.jpg'
      : '/textures/skybox/stars_milky_way_8k.jpg',
    [],
  );

  return (
    <Environment
      files={texturePath}
      background
      backgroundBlurriness={0}
      backgroundIntensity={0.5}
    />
  );
}
