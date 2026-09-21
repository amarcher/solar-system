export interface TextureVariant {
  path: string;
  width: number;
  height: number;
  detailOnly?: boolean;
}

export interface TextureAsset {
  id: string;
  bodyId?: string;
  kind: 'diffuse' | 'clouds' | 'sky' | 'rock';
  variants: readonly TextureVariant[];
  provenance: {
    status: 'verified' | 'pending';
    credit: string;
    sourceUrl?: string;
    licenseUrl?: string;
    notes: string;
  };
  coverage?: string;
}

export interface TextureSelection {
  detail?: boolean;
  maxWidth?: number;
}

const legacyProvenance: TextureAsset['provenance'] = {
  status: 'pending',
  credit: 'Existing bundled asset; individual provenance review pending',
  notes: 'README attributes planet and moon textures broadly to Solar System Scope. This is not verified per file; do not assume its license applies to every moon.',
};

const albersMoonIds = new Set(['io', 'europa', 'ganymede', 'callisto', 'titan', 'enceladus', 'mimas', 'triton', 'charon']);
const unresolvedMoonIds = new Set(['phobos', 'deimos', 'rhea', 'dione', 'tethys', 'iapetus', 'hyperion']);

function diffuseProvenance(bodyId: string): TextureAsset['provenance'] {
  if (bodyId === 'earth') return {
    status: 'verified', credit: 'Solar System Scope',
    sourceUrl: 'https://www.solarsystemscope.com/textures/',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    notes: 'Bundled Earth JPEG is byte-identical to https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg, verified 2026-09-21. SHA-256: 767ee1dc6eb3802699bfccf6f264880f8acd0b80de3191cd24984fe279b07b7c. No image changes.',
  };
  if (bodyId === 'moon') return {
    status: 'verified', credit: 'Solar System Scope',
    sourceUrl: 'https://www.solarsystemscope.com/textures/',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    notes: 'Bundled Moon JPEG is byte-identical to the publisher\'s 2K Moon file, verified 2026-09-21. No image changes. See docs/assets/legacy-moon-provenance.md.',
  };
  if (albersMoonIds.has(bodyId)) return {
    status: 'pending', credit: 'Original image credit under review',
    notes: `Import commit f1bcaf9 attributes this map to Steve Albers. Exact file provenance and permission remain unresolved; the current Albers catalog permits personal non-commercial use only.${bodyId === 'callisto' ? ' Strong visual match to Björn Jónsson\'s published map; transformation chain remains unresolved.' : ''} See docs/assets/legacy-moon-provenance.md.`,
  };
  if (unresolvedMoonIds.has(bodyId)) return {
    status: 'pending', credit: 'Original image credit under review',
    notes: 'Import commit 82ba471 lists Albers, USGS, and Celestia collectively, without per-file sources or terms. See docs/assets/legacy-moon-provenance.md; do not assume a license.',
  };
  return legacyProvenance;
}

const uranianMoonIds = ['miranda', 'ariel', 'titania', 'oberon', 'umbriel'] as const;

// Explicit inventory prevents unsupported moons from issuing speculative requests.
const diffuseBodies = [
  'callisto', 'ceres', 'charon', 'deimos', 'dione', 'earth', 'enceladus',
  'europa', 'ganymede', 'hyperion', 'iapetus', 'io', 'jupiter', 'mars',
  'mercury', 'mimas', 'moon', 'neptune', 'phobos', 'pluto', 'rhea', 'saturn',
  'sun', 'tethys', 'titan', 'triton', 'uranus', 'venus',
] as const;

export const textureManifest: readonly TextureAsset[] = [
  ...diffuseBodies.map((bodyId): TextureAsset => ({
    id: `${bodyId}-diffuse`, bodyId, kind: 'diffuse',
    variants: [{
      path: `/textures/2k/${bodyId}_diffuse.jpg`,
      width: bodyId === 'uranus' ? 1024 : bodyId === 'pluto' ? 2000 : 2048,
      height: bodyId === 'uranus' ? 512 : bodyId === 'pluto' ? 1000 : 1024,
    }],
    provenance: diffuseProvenance(bodyId),
  })),
  ...uranianMoonIds.map((bodyId): TextureAsset => ({
    id: `${bodyId}-diffuse`, bodyId, kind: 'diffuse',
    variants: [
      { path: `/textures/1k/${bodyId}_diffuse.jpg`, width: 1024, height: 512 },
      { path: `/textures/2k/${bodyId}_diffuse.jpg`, width: 1440, height: 720, detailOnly: true },
    ],
    provenance: {
      status: 'verified', credit: 'USGS/Tammy Becker & JPL/Caltech, via NASA 3D Resources',
      sourceUrl: `https://science.nasa.gov/3d-resources/uranus-${bodyId}/`,
      licenseUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
      notes: 'Voyager southern mosaic; resized for display and source no-data shown in plain gray. No synthesized terrain or upscaling. Longitude convention is unverified. Source identity, hashes and processing: docs/assets/uranian-moons.md.',
    },
    coverage: 'Voyager photographed part of this moon. Plain gray areas have no imagery in this map.',
  })),
  {
    id: 'earth-clouds', bodyId: 'earth', kind: 'clouds',
    variants: [{ path: '/textures/2k/earth_clouds.jpg', width: 2048, height: 1024 }],
    provenance: {
      status: 'verified', credit: 'Solar System Scope',
      sourceUrl: 'https://www.solarsystemscope.com/textures/',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      notes: 'Bundled clouds JPEG is byte-identical to https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg, verified 2026-09-21. SHA-256: fffd7f68d41b37274822150e54a6ef605af1d3ec35624d9f628c3b896bfa42ed. No image changes.',
    },
  },
  {
    id: 'milky-way', kind: 'sky',
    variants: [
      { path: '/textures/skybox/stars_milky_way_2k.jpg', width: 2048, height: 1024 },
      { path: '/textures/skybox/stars_milky_way_4k.jpg', width: 4096, height: 2048, detailOnly: true },
      { path: '/textures/skybox/stars_milky_way_8k.jpg', width: 8192, height: 4096, detailOnly: true },
    ],
    provenance: {
      status: 'verified', credit: 'Solar System Scope',
      sourceUrl: 'https://www.solarsystemscope.com/textures/',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      notes: '8K source verified byte-for-byte against publisher on 2026-09-21. 4K derived with sips; see docs/assets/sky-quality.md. Star-rich artistic panorama.',
    },
  },
  ...['01', '02', '03'].map((number): TextureAsset => ({
    id: `asteroid-rock-${number}`, kind: 'rock',
    variants: [{ path: `/textures/asteroids/rock_${number}.jpg`, width: 1024, height: 1024 }],
    provenance: {
      status: 'pending', credit: 'Existing bundled asteroid texture; provenance pending',
      notes: 'README says procedural and/or public domain but identifies no individual source.',
    },
  })),
];

export function selectTextureVariant(asset: TextureAsset, options: TextureSelection = {}): TextureVariant | null {
  const maximum = options.maxWidth ?? 2048;
  const variants = asset.variants.filter((variant) => !variant.detailOnly || options.detail)
    .sort((a, b) => a.width - b.width);
  // Use the smallest available map when no lower-resolution derivative exists yet.
  return variants.filter((variant) => variant.width <= maximum).at(-1) ?? variants[0] ?? null;
}

export function getBodyTexture(bodyId: string, options: TextureSelection = {}): TextureVariant | null {
  const asset = getBodyTextureAsset(bodyId);
  return asset ? selectTextureVariant(asset, options) : null;
}

export function getBodyTextureAsset(bodyId: string): TextureAsset | undefined {
  return textureManifest.find((entry) => entry.kind === 'diffuse' && entry.bodyId === bodyId);
}

export function estimateTextureBytes(width: number, height: number): number {
  return Math.ceil(width * height * 4 * 4 / 3); // RGBA with a complete mip chain.
}
