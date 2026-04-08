import { useEffect, useMemo } from 'react';
import { useThree, useLoader } from '@react-three/fiber';
import { TextureLoader, EquirectangularReflectionMapping, SRGBColorSpace } from 'three';
import { texturePath } from '../../utils/textures';

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/**
 * Immersive Milky Way backdrop. Loads the equirectangular JPG directly via
 * Three.js's TextureLoader and assigns it to the scene background. We used
 * to render this through drei's <Environment>, but that pipes JPGs through
 * HDRJPGLoader (expects gain-map metadata) and bakes a low-res cubemap as
 * the background — even when the source is 8K. Going through TextureLoader
 * preserves the full source resolution and skips the noisy "Gain map
 * metadata not found" warning.
 *
 * Mobile uses a 2K version to avoid memory crashes on lower-end devices.
 */
export function CelestialBackdrop() {
  const file = useMemo(
    () => texturePath(
      isMobile
        ? '/textures/skybox/stars_milky_way_2k.jpg'
        : '/textures/skybox/stars_milky_way_8k.jpg',
    ),
    [],
  );

  const texture = useLoader(TextureLoader, file);
  const { scene } = useThree();

  useEffect(() => {
    texture.mapping = EquirectangularReflectionMapping;
    texture.colorSpace = SRGBColorSpace;
    const prevBackground = scene.background;
    const prevIntensity = scene.backgroundIntensity;
    scene.background = texture;
    scene.backgroundIntensity = 0.5;
    return () => {
      scene.background = prevBackground;
      scene.backgroundIntensity = prevIntensity;
    };
  }, [texture, scene]);

  return null;
}
