import { useState, useEffect, useMemo } from 'react';
import { TextureLoader, Texture, SRGBColorSpace, CanvasTexture, RepeatWrapping } from 'three';

const loader = new TextureLoader();
const textureCache = new Map<string, Texture | null>();

export const CDN_URL = import.meta.env.VITE_TEXTURE_CDN_URL as string | undefined;

/**
 * Opt-in flag to fetch 8K planet diffuse maps from the CDN in the background
 * and upgrade the bundled 2K textures. Leave unset until the 8K textures are
 * actually uploaded to the CDN — otherwise every planet 404s on page load.
 *
 * To enable: set VITE_TEXTURE_CDN_HIRES=true and upload the files to
 *   {VITE_TEXTURE_CDN_URL}/textures/8k/{planetId}_diffuse.jpg
 */
const CDN_HIRES_ENABLED =
  (import.meta.env.VITE_TEXTURE_CDN_HIRES as string | undefined)?.toLowerCase() === 'true';

/**
 * Planet IDs that have 8K (or 4K) diffuse maps uploaded to the CDN.
 * Sourced from Solar System Scope (CC BY 4.0). Uranus, Neptune, Pluto, and
 * Ceres are not in this list because no 8K equirectangular versions exist
 * from a free source — they continue to use the bundled 2K.
 */
const HIRES_AVAILABLE_PLANETS = new Set<string>([
  'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'moon',
]);

/** Resolve a texture path, preferring CDN when configured. */
export function texturePath(path: string): string {
  return CDN_URL ? `${CDN_URL}${path}` : path;
}

/**
 * Load a planet's diffuse texture. Always loads the bundled 2K first, then
 * optionally upgrades to 8K from the CDN if `VITE_TEXTURE_CDN_HIRES=true`.
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

        // Optional background upgrade to 8K. Gated behind an explicit
        // opt-in AND a per-planet allowlist so we don't 404-spam the
        // console for planets we don't have hi-res for.
        if (CDN_URL && CDN_HIRES_ENABLED && HIRES_AVAILABLE_PLANETS.has(planetId)) {
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
 * Load an arbitrary texture by path from public/.
 * Returns null while loading or if the file doesn't exist.
 */
export function useTexturePath(path: string): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(() =>
    textureCache.get(path) ?? null,
  );

  useEffect(() => {
    if (textureCache.has(path)) {
      setTexture(textureCache.get(path) ?? null);
      return;
    }

    let cancelled = false;
    loader.load(
      path,
      (tex) => {
        if (cancelled) return;
        tex.colorSpace = SRGBColorSpace;
        textureCache.set(path, tex);
        setTexture(tex);
      },
      undefined,
      () => {
        if (!cancelled) {
          textureCache.set(path, null);
          setTexture(null);
        }
      },
    );

    return () => { cancelled = true; };
  }, [path]);

  return texture;
}

/** Simple seeded PRNG for deterministic ring noise. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Procedural ring texture for Saturn / Uranus.
 * Creates a 2D radial texture with per-pixel particle noise, fine sub-bands,
 * and color variation to simulate realistic icy ring structure.
 */
export function useRingTexture(planetId: 'saturn' | 'uranus'): Texture {
  return useMemo(() => {
    const W = 2048;
    const H = 64;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // First pass: paint the base radial gradient across full width
    if (planetId === 'saturn') {
      paintSaturnRings(ctx, W, H);
    } else {
      paintUranusRings(ctx, W, H);
    }

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }, [planetId]);
}

function paintSaturnRings(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const rng = mulberry32(42);

  // Ring density profile — maps radial position (0..1) to optical depth (0..1)
  // Based on Cassini observations of Saturn's ring structure
  const density = (t: number): number => {
    // D ring (very faint)
    if (t < 0.06) return 0.03 * smoothstep(0, 0.06, t);
    // C ring (translucent)
    if (t < 0.18) return 0.12 + 0.08 * Math.sin((t - 0.06) * 80);
    // B ring (densest, with fine structure)
    if (t < 0.44) {
      const base = 0.7 + 0.15 * Math.sin((t - 0.18) * 25);
      // Fine sub-bands in B ring
      const fine = 0.05 * Math.sin(t * 300) + 0.03 * Math.sin(t * 500);
      return Math.min(1, base + fine);
    }
    // Cassini Division
    if (t < 0.50) return 0.02 + 0.01 * Math.sin(t * 200);
    // A ring
    if (t < 0.72) {
      const base = 0.4 + 0.1 * Math.sin((t - 0.50) * 30);
      // Encke Gap
      if (t > 0.62 && t < 0.635) return 0.01;
      // Keeler Gap
      if (t > 0.70 && t < 0.71) return 0.01;
      const fine = 0.04 * Math.sin(t * 400);
      return base + fine;
    }
    // Roche Division
    if (t < 0.78) return 0.01;
    // F ring (narrow, bright)
    if (t > 0.79 && t < 0.82) {
      const center = 0.805;
      const dist = Math.abs(t - center) / 0.015;
      return 0.25 * Math.max(0, 1 - dist * dist);
    }
    return 0;
  };

  // Ring color — warm gold to icy white variation
  const ringColor = (t: number): [number, number, number] => {
    // B ring is slightly brighter/whiter, C ring more brown, A ring golden
    if (t < 0.18) return [160, 140, 110]; // C ring — brownish
    if (t < 0.44) return [225, 210, 178]; // B ring — bright cream
    if (t < 0.50) return [120, 100, 75];  // Cassini — dark
    if (t < 0.72) return [205, 190, 158]; // A ring — golden
    return [200, 185, 155]; // F ring
  };

  const imageData = ctx.createImageData(W, H);
  const data = imageData.data;

  for (let x = 0; x < W; x++) {
    const t = x / W; // radial position 0..1
    const d = density(t);
    const [r, g, b] = ringColor(t);

    for (let y = 0; y < H; y++) {
      const idx = (y * W + x) * 4;
      // Particle noise — gives granular, icy appearance
      const noise = 0.6 + 0.4 * rng();
      // Azimuthal streaks — subtle brightness variation along the ring
      const streak = 0.9 + 0.1 * Math.sin(y * 0.8 + x * 0.02);
      const brightness = noise * streak;

      // Color variation per pixel
      const colorNoise = (rng() - 0.5) * 15;
      data[idx + 0] = Math.min(255, Math.max(0, r * brightness + colorNoise));
      data[idx + 1] = Math.min(255, Math.max(0, g * brightness + colorNoise * 0.8));
      data[idx + 2] = Math.min(255, Math.max(0, b * brightness + colorNoise * 0.6));
      data[idx + 3] = Math.min(255, d * 255 * brightness);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function paintUranusRings(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const rng = mulberry32(99);

  // Uranus has 13 known rings, mostly very faint and narrow
  const density = (t: number): number => {
    // Inner rings (6, 5, 4, Alpha, Beta)
    const rings: Array<[number, number, number]> = [
      [0.20, 0.005, 0.06], // Ring 6
      [0.24, 0.005, 0.05], // Ring 5
      [0.28, 0.005, 0.05], // Ring 4
      [0.34, 0.008, 0.07], // Alpha
      [0.38, 0.008, 0.08], // Beta
      [0.42, 0.004, 0.04], // Eta
      [0.46, 0.004, 0.04], // Gamma
      [0.49, 0.004, 0.04], // Delta
      [0.52, 0.004, 0.03], // Lambda
      [0.56, 0.020, 0.18], // Epsilon (brightest, widest)
    ];
    let d = 0;
    for (const [center, halfWidth, peak] of rings) {
      const dist = Math.abs(t - center) / halfWidth;
      if (dist < 1) d += peak * (1 - dist * dist);
    }
    return Math.min(1, d);
  };

  const imageData = ctx.createImageData(W, H);
  const data = imageData.data;

  for (let x = 0; x < W; x++) {
    const t = x / W;
    const d = density(t);
    for (let y = 0; y < H; y++) {
      const idx = (y * W + x) * 4;
      const noise = 0.7 + 0.3 * rng();
      data[idx + 0] = Math.min(255, 155 + 20 * noise);
      data[idx + 1] = Math.min(255, 190 + 15 * noise);
      data[idx + 2] = Math.min(255, 210 + 10 * noise);
      data[idx + 3] = Math.min(255, d * 255 * noise);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/** Smooth step interpolation. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
