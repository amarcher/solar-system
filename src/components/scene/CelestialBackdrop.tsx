import { Environment } from '@react-three/drei';

/** Immersive space backdrop using an 8K Milky Way panorama. */
export function CelestialBackdrop() {
  return (
    <Environment
      files="/textures/skybox/stars_milky_way_8k.jpg"
      background
      backgroundBlurriness={0}
      backgroundIntensity={0.5}
    />
  );
}
