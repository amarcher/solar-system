import { useState, useEffect, useMemo } from 'react';
import { TextureLoader, Texture, SRGBColorSpace, CanvasTexture, RepeatWrapping } from 'three';

const loader = new TextureLoader();
const textureCache = new Map<string, Texture | null>();

const CDN_URL = import.meta.env.VITE_TEXTURE_CDN_URL as string | undefined;

/**
 * Load a planet's diffuse texture. Tries bundled 2k first,
 * then optionally upgrades to high-res from CDN.
 * Returns null if no texture file exists (falls back to solid color).
 */
export function usePlanetTexture(planetId: string): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(() =>
    textureCache.get(planetId) ?? null,
  );
  const [loaded, setLoaded] = useState(() => textureCache.has(planetId));

  useEffect(() => {
    if (textureCache.has(planetId)) {
      setTexture(textureCache.get(planetId) ?? null);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    const path = `/textures/2k/${planetId}_diffuse.jpg`;

    loader.load(
      path,
      (tex) => {
        if (cancelled) return;
        tex.colorSpace = SRGBColorSpace;
        textureCache.set(planetId, tex);
        setTexture(tex);
        setLoaded(true);

        // If CDN is configured, upgrade to high-res in the background
        if (CDN_URL) {
          const hiResPath = `${CDN_URL}/textures/8k/${planetId}_diffuse.jpg`;
          loader.load(
            hiResPath,
            (hiTex) => {
              if (cancelled) return;
              hiTex.colorSpace = SRGBColorSpace;
              textureCache.set(planetId, hiTex);
              setTexture(hiTex);
              tex.dispose();
            },
            undefined,
            () => { /* hi-res not available, keep 2k */ },
          );
        }
      },
      undefined,
      () => {
        // No texture file found — solid color fallback
        if (!cancelled) {
          textureCache.set(planetId, null);
          setTexture(null);
          setLoaded(true);
        }
      },
    );

    return () => { cancelled = true; };
  }, [planetId]);

  return loaded ? texture : null;
}

/**
 * Procedural ring texture for Saturn / Uranus.
 * Creates a 1D radial gradient with gaps to simulate ring bands.
 */
export function useRingTexture(planetId: 'saturn' | 'uranus'): Texture {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1; // 1D radial
    const ctx = canvas.getContext('2d')!;

    if (planetId === 'saturn') {
      // Saturn: D ring → C ring → B ring → Cassini Division → A ring → F ring
      const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
      // Inner edge (D ring — very faint)
      gradient.addColorStop(0.0, 'rgba(180, 160, 130, 0.0)');
      gradient.addColorStop(0.05, 'rgba(180, 160, 130, 0.08)');
      // C ring (faint)
      gradient.addColorStop(0.08, 'rgba(160, 140, 110, 0.15)');
      gradient.addColorStop(0.18, 'rgba(170, 150, 120, 0.2)');
      // B ring (brightest, densest)
      gradient.addColorStop(0.20, 'rgba(210, 195, 165, 0.6)');
      gradient.addColorStop(0.28, 'rgba(225, 210, 175, 0.75)');
      gradient.addColorStop(0.35, 'rgba(220, 200, 168, 0.7)');
      gradient.addColorStop(0.42, 'rgba(215, 198, 165, 0.65)');
      // Cassini Division (gap)
      gradient.addColorStop(0.44, 'rgba(100, 80, 60, 0.05)');
      gradient.addColorStop(0.48, 'rgba(100, 80, 60, 0.03)');
      // A ring
      gradient.addColorStop(0.50, 'rgba(200, 185, 155, 0.5)');
      gradient.addColorStop(0.55, 'rgba(195, 180, 150, 0.45)');
      // Encke Gap
      gradient.addColorStop(0.62, 'rgba(195, 178, 148, 0.4)');
      gradient.addColorStop(0.63, 'rgba(100, 80, 60, 0.02)');
      gradient.addColorStop(0.64, 'rgba(190, 175, 145, 0.35)');
      // Outer A ring
      gradient.addColorStop(0.72, 'rgba(185, 170, 140, 0.3)');
      // F ring (thin, faint)
      gradient.addColorStop(0.78, 'rgba(180, 165, 135, 0.0)');
      gradient.addColorStop(0.80, 'rgba(200, 185, 155, 0.2)');
      gradient.addColorStop(0.82, 'rgba(180, 165, 135, 0.0)');
      // Beyond rings
      gradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.0)');
      gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1024, 1);
    } else {
      // Uranus: much fainter, narrower rings
      const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
      gradient.addColorStop(0.0, 'rgba(160, 196, 212, 0.0)');
      gradient.addColorStop(0.15, 'rgba(160, 196, 212, 0.0)');
      // Inner rings
      gradient.addColorStop(0.20, 'rgba(140, 170, 185, 0.08)');
      gradient.addColorStop(0.25, 'rgba(140, 170, 185, 0.0)');
      gradient.addColorStop(0.30, 'rgba(150, 180, 195, 0.1)');
      gradient.addColorStop(0.35, 'rgba(150, 180, 195, 0.0)');
      // Epsilon ring (brightest)
      gradient.addColorStop(0.50, 'rgba(160, 196, 212, 0.0)');
      gradient.addColorStop(0.52, 'rgba(160, 196, 212, 0.15)');
      gradient.addColorStop(0.55, 'rgba(160, 196, 212, 0.12)');
      gradient.addColorStop(0.57, 'rgba(160, 196, 212, 0.0)');
      // Outer faint rings
      gradient.addColorStop(0.70, 'rgba(140, 170, 185, 0.05)');
      gradient.addColorStop(0.75, 'rgba(140, 170, 185, 0.0)');
      gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1024, 1);
    }

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }, [planetId]);
}
