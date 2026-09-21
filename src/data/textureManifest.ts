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
    provenance: legacyProvenance,
  })),
  {
    id: 'earth-clouds', bodyId: 'earth', kind: 'clouds',
    variants: [{ path: '/textures/2k/earth_clouds.jpg', width: 2048, height: 1024 }],
    provenance: legacyProvenance,
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
  const asset = textureManifest.find((entry) => entry.kind === 'diffuse' && entry.bodyId === bodyId);
  return asset ? selectTextureVariant(asset, options) : null;
}

export function estimateTextureBytes(width: number, height: number): number {
  return Math.ceil(width * height * 4 * 4 / 3); // RGBA with a complete mip chain.
}
