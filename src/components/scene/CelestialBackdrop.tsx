import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { EquirectangularReflectionMapping, type Scene, type Texture } from 'three';
import { useTexturePath } from '../../utils/textures';
import { useGraphicsQuality } from '../../performance/useGraphicsQuality';

export function CelestialBackdrop() {
  const { preference, settings } = useGraphicsQuality();
  // Automatic starts with the inexpensive sky; detail is an explicit choice.
  const width = preference === 'detailed' ? settings.skyWidth : 2048;
  const overview = useTexturePath('/textures/skybox/stars_milky_way_2k.jpg');
  const detail = useTexturePath(width === 4096 ? '/textures/skybox/stars_milky_way_4k.jpg' : '');
  const texture = detail ?? overview;
  const { scene } = useThree();

  useEffect(() => texture ? applyBackdrop(scene, texture) : undefined, [texture, scene]);
  return null;
}

function applyBackdrop(scene: Scene, texture: Texture) {
  texture.mapping = EquirectangularReflectionMapping;
  const previousBackground = scene.background;
  const previousIntensity = scene.backgroundIntensity;
  scene.background = texture;
  scene.backgroundIntensity = 0.5;
  return () => {
    if (scene.background === texture) {
      scene.background = previousBackground;
      scene.backgroundIntensity = previousIntensity;
    }
  };
}
