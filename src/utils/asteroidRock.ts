import { BufferAttribute, Color, IcosahedronGeometry, Vector3, type BufferGeometry } from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Procedural small-body geometry: a lumpy, cratered, vertex-colored rock that
 * is unique (and stable) per seed. Shapes are artistic; nobody has imaged these
 * objects up close. Composition only steers color and surface character.
 */

export type RockComposition = 'stony' | 'carbon' | 'icy' | 'comet';

interface Palette {
  base: string;
  dark: string;
  light: string;
  /** How strongly bright patches (ice, fresh rock) show through. */
  patchiness: number;
  /** Relative crater count and depth. */
  cratering: number;
  /** Amplitude of large-scale lumps. */
  lumpiness: number;
}

const PALETTES: Record<RockComposition, Palette> = {
  // S-type: gray-tan silicate rock.
  stony: { base: '#8d8273', dark: '#5a5046', light: '#b5ab9b', patchiness: 0.25, cratering: 1, lumpiness: 0.22 },
  // C/D-type: very dark, slightly brown carbon-rich rock.
  carbon: { base: '#3c3530', dark: '#221e1b', light: '#5a5048', patchiness: 0.15, cratering: 0.9, lumpiness: 0.2 },
  // Outer-solar-system ice + rock, reddened by irradiation, with bright ice.
  icy: { base: '#9a6f5a', dark: '#6b4a3c', light: '#e8e2da', patchiness: 0.55, cratering: 0.6, lumpiness: 0.16 },
  // Comet nucleus: among the darkest surfaces known, with a few bright spots.
  comet: { base: '#2f2b29', dark: '#1a1817', light: '#8c8a88', patchiness: 0.2, cratering: 0.5, lumpiness: 0.3 },
};

export function seedFromString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded 3D value noise on an integer lattice with smoothstep interpolation. */
function makeNoise(seed: number) {
  const hash = (x: number, y: number, z: number) => {
    let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const noise = (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = smooth(x - xi), v = smooth(y - yi), w = smooth(z - zi);
    const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
    return lerp(
      lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
      lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
      w,
    ) * 2 - 1;
  };
  return (x: number, y: number, z: number, octaves: number) => {
    let sum = 0, amp = 1, freq = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x * freq, y * freq, z * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  };
}

export interface RockOptions {
  seed: number;
  composition: RockComposition;
  /**
   * 0 = nearly round, 1 = fully potato-shaped. Bodies hundreds of km across
   * are pulled rounder by their own gravity; small ones keep any shape.
   */
  irregularity?: number;
  /** Icosahedron subdivision (linear: 20·(n+1)² faces). ~6 for distant markers, ~48 for a close-up. */
  detail: number;
}

/** Unit-scale rock (longest semi-axis ≈ 1) with a `color` attribute. */
export function createRockGeometry({ seed, composition, detail, irregularity = 1 }: RockOptions): BufferGeometry {
  const palette = PALETTES[composition];
  const random = mulberry32(seed);
  const fbm = makeNoise(seed);

  // Elongated, never spherical: most small bodies are potato-shaped.
  const axes = new Vector3(1, 0.6 + random() * 0.3, 0.45 + random() * 0.3).lerp(new Vector3(1, 1, 1), 1 - irregularity);
  const lumpiness = palette.lumpiness * (0.35 + 0.65 * irregularity);
  const craterCount = Math.round((28 + random() * 20) * palette.cratering);
  const craters = Array.from({ length: craterCount }, () => {
    const dir = new Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize();
    // Few big craters, many small ones; depth ≈ 0.2 × diameter like real bowls.
    const radius = 0.06 + Math.pow(random(), 3) * 0.4;
    return { dir, radius, depth: radius * (0.3 + random() * 0.2) * palette.cratering };
  });

  const geometry = mergeVertices(new IcosahedronGeometry(1, detail));
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const base = new Color(palette.base), dark = new Color(palette.dark), light = new Color(palette.light);
  const color = new Color();
  const dir = new Vector3();

  for (let i = 0; i < position.count; i++) {
    dir.fromBufferAttribute(position, i).normalize();

    let radius = 1 + lumpiness * fbm(dir.x * 1.3 + 7, dir.y * 1.3, dir.z * 1.3, 3);
    radius += 0.05 * fbm(dir.x * 6, dir.y * 6 + 3, dir.z * 6, 3);
    // Fine grit so close-ups catch the light.
    radius += 0.018 * fbm(dir.x * 18 - 2, dir.y * 18, dir.z * 18 + 4, 2);

    let craterShade = 0;
    for (const crater of craters) {
      const angle = Math.acos(Math.min(1, Math.max(-1, dir.dot(crater.dir))));
      const t = angle / crater.radius;
      if (t < 1) {
        radius -= crater.depth * (1 - t ** 4);
        craterShade -= 0.3 * (1 - t);
      } else if (t < 1.3) {
        const rim = Math.sin(((t - 1) / 0.3) * Math.PI);
        radius += crater.depth * 0.3 * rim;
        craterShade += 0.3 * rim;
      }
    }

    const mottling = fbm(dir.x * 4 + 11, dir.y * 4, dir.z * 4 - 5, 4);
    color.copy(base).lerp(mottling < 0 ? dark : light, Math.min(1, Math.abs(mottling) * 1.3));
    const patch = fbm(dir.x * 2.2 - 3, dir.y * 2.2 + 9, dir.z * 2.2, 3);
    if (patch > 0.35 - palette.patchiness * 0.3) color.lerp(light, Math.min(1, (patch - 0.2) * palette.patchiness * 2.5));
    color.lerp(craterShade < 0 ? dark : light, Math.min(0.6, Math.abs(craterShade)));
    color.toArray(colors, i * 3);

    position.setXYZ(i, dir.x * radius * axes.x, dir.y * radius * axes.y, dir.z * radius * axes.z);
  }

  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Irregularity for a body of this size: gravity rounds things off above a few hundred km. */
export function irregularityForDiameter(km: number): number {
  return Math.min(1, Math.max(0.15, 1 - (km - 150) / 400));
}
