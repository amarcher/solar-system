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
  /** How the map was made, shown with the credit. */
  displayNote?: string;
  /** Imagined surface with no observational basis; never describe it as seen. */
  illustration?: boolean;
}

/** What, if anything, the imagined look of a captured moon borrows from telescopes. */
const ILLUSTRATION_NOTES: Record<string, string> = {
  himalia: 'Made up to show what a small, cratered moon might look like. Its dark grey colour follows telescope measurements.',
  carme: 'Made up to show what a small, cratered moon might look like. Its light red colour follows telescope measurements.',
  pasiphae: 'Made up to show what a small, cratered moon might look like. Its grey colour follows telescope measurements.',
  valetudo: 'Made up to show what a tiny, battered moon might look like. Nobody has measured its colour yet, so that is a guess too.',
};

export interface TextureSelection {
  detail?: boolean;
  maxWidth?: number;
}

const CC_BY_4 = 'https://creativecommons.org/licenses/by/4.0/';
const NASA_TERMS = 'https://www.nasa.gov/nasa-brand-center/images-and-media/';
const USGS_TERMS = 'https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits';
const STOOKE_PAGE = 'https://sbnarchive.psi.edu/pds3/multi_mission/MULTI_SA_MULTI_6_STOOKEMAPS_V2_0/document/aamapdesc.html';
const STOOKE_CREDIT = 'Phil Stooke, Stooke Small Bodies Maps V2.0, NASA Planetary Data System';
const SCHENK_CREDIT = 'NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk)';
const USGS_GALILEO_CREDIT = 'NASA/JPL/USGS Astrogeology Science Center (Voyager, Galileo)';
const TONED_DOWN = 'Resized for display. NASA\'s enhanced colors were toned down toward natural color.';
const GRAY_FILL = 'Areas without imagery are plain gray; no terrain was invented.';

// Byte-identical Solar System Scope downloads (CC BY 4.0), verified 2026-09-21/28.
const solarSystemScopeFiles = {
  earth: '2k_earth_daymap', moon: '2k_moon', mercury: '2k_mercury', venus: '2k_venus_surface', mars: '2k_mars',
  jupiter: '2k_jupiter', saturn: '2k_saturn', uranus: '2k_uranus', neptune: '2k_neptune', sun: '2k_sun',
} as const;

interface MapSource {
  credit: string;
  sourceUrl: string;
  licenseUrl: string;
  notes: string;
  coverage?: string;
  displayNote: string;
}

// Rebuilt by scripts/assets/build_public_domain_maps.py; details in docs/assets/public-domain-maps.md.
const publicDomainMaps: Record<string, MapSource> = {
  phobos: {
    credit: STOOKE_CREDIT, sourceUrl: STOOKE_PAGE, licenseUrl: STOOKE_PAGE,
    notes: 'Public domain, citation requested. Stooke photomosaic from Viking, MGS, Mars Express and MRO images with Cornell control. Replaces a south-up relief drawing.',
    displayNote: 'Resized for display from a photo mosaic.',
  },
  deimos: {
    credit: STOOKE_CREDIT, sourceUrl: STOOKE_PAGE, licenseUrl: STOOKE_PAGE,
    notes: 'Public domain, citation requested. Stooke photomosaic from Viking and MRO HiRISE images. Replaces a south-up older version.',
    displayNote: 'Resized for display from a photo mosaic.',
  },
  io: {
    credit: USGS_GALILEO_CREDIT, sourceUrl: 'https://astrogeology.usgs.gov/search/map/io_galileo_ssi_voyager_color_merged_global_mosaic_1km', licenseUrl: USGS_TERMS,
    notes: 'USGS color-merged global mosaic, public domain. Longitude rolled 180° to the app convention, then resized.',
    displayNote: 'Resized for display from a spacecraft photo mosaic.',
  },
  europa: {
    credit: USGS_GALILEO_CREDIT, sourceUrl: 'https://astrogeology.usgs.gov/search/map/Europa/Voyager-Galileo/Europa_Voyager_GalileoSSI_global_mosaic_500m', licenseUrl: USGS_TERMS,
    notes: 'USGS 500 m grayscale global mosaic, public domain. Uniform cream tint, south-pole no-data filled gray.',
    displayNote: `Resized for display. The mosaic is black-and-white; the app adds a gentle overall tint. ${GRAY_FILL}`,
  },
  ganymede: {
    credit: USGS_GALILEO_CREDIT, sourceUrl: 'https://astrogeology.usgs.gov/search/map/ganymede_voyager_galileo_ssi_color_global_mosaic_1_4km', licenseUrl: USGS_TERMS,
    notes: 'USGS 1.4 km color global mosaic, public domain. Polar no-data filled gray.',
    displayNote: `Resized for display. ${GRAY_FILL}`,
  },
  callisto: {
    credit: USGS_GALILEO_CREDIT, sourceUrl: 'https://astrogeology.usgs.gov/search/map/callisto_galileo_voyager_global_mosaic_1km', licenseUrl: USGS_TERMS,
    notes: 'USGS 1 km grayscale global mosaic, public domain. Uniform warm tint, southern no-data filled gray. Replaces an upscaled derivative of Björn Jónsson\'s map.',
    displayNote: `Resized for display. The mosaic is black-and-white; the app adds a gentle overall tint. ${GRAY_FILL}`,
  },
  titan: {
    credit: 'NASA/JPL-Caltech/Univ. Arizona', sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA22770', licenseUrl: NASA_TERMS,
    notes: 'PIA22770 Cassini near-infrared (938 nm) surface mosaic. Uniform warm tint added; the orange haze is not shown.',
    coverage: 'This shows Titan\'s ground, seen in infrared through its thick orange haze.',
    displayNote: 'Resized for display. The infrared mosaic is black-and-white; the app adds a warm tint.',
  },
  enceladus: { credit: SCHENK_CREDIT, sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA18435', licenseUrl: NASA_TERMS, notes: 'PIA18435 Cassini/Voyager enhanced-color global map (2014); saturation reduced to 30%.', displayNote: TONED_DOWN },
  mimas: { credit: SCHENK_CREDIT, sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA18437', licenseUrl: NASA_TERMS, notes: 'PIA18437 Cassini/Voyager enhanced-color global map (2014); saturation reduced to 30%.', displayNote: TONED_DOWN },
  rhea: { credit: SCHENK_CREDIT, sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA18438', licenseUrl: NASA_TERMS, notes: 'PIA18438 Cassini/Voyager enhanced-color global map (2014); saturation reduced to 30%.', displayNote: TONED_DOWN },
  dione: { credit: SCHENK_CREDIT, sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA18434', licenseUrl: NASA_TERMS, notes: 'PIA18434 Cassini/Voyager enhanced-color global map (2014); saturation reduced to 30%.', displayNote: TONED_DOWN },
  tethys: { credit: SCHENK_CREDIT, sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA18439', licenseUrl: NASA_TERMS, notes: 'PIA18439 Cassini/Voyager enhanced-color global map (2014); saturation reduced to 30%.', displayNote: TONED_DOWN },
  iapetus: { credit: SCHENK_CREDIT, sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA18436', licenseUrl: NASA_TERMS, notes: 'PIA18436 Cassini/Voyager enhanced-color global map (2014); saturation reduced to 30%.', displayNote: TONED_DOWN },
  triton: {
    credit: 'NASA/JPL-Caltech/Lunar & Planetary Institute (Paul Schenk)', sourceUrl: 'https://science.nasa.gov/photojournal/map-of-triton', licenseUrl: NASA_TERMS,
    notes: 'PIA18668 Voyager 2 enhanced-color global mosaic (also USGS 600 m). Saturation reduced to 50%; unimaged north (~39%) filled gray.',
    coverage: 'Voyager 2 photographed only part of Triton. Plain gray areas have no imagery in this map.',
    displayNote: `Resized for display; colors toned down. ${GRAY_FILL}`,
  },
  charon: {
    credit: 'NASA/JHUAPL/SwRI/Lunar and Planetary Institute (New Horizons Team), via USGS Astrogeology', sourceUrl: 'https://astrogeology.usgs.gov/search/map/charon_new_horizons_lorri_mvic_global_mosaic_300m', licenseUrl: NASA_TERMS,
    notes: 'USGS New Horizons 300 m grayscale global mosaic; unseen south (~34%) filled gray.',
    coverage: 'New Horizons saw only one side of Charon up close. Plain gray areas have no imagery in this map.',
    displayNote: `Resized for display. ${GRAY_FILL}`,
  },
  pluto: {
    credit: 'NASA/Johns Hopkins University Applied Physics Laboratory/Southwest Research Institute', sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA11707', licenseUrl: NASA_TERMS,
    notes: 'PIA11707 New Horizons color map; unseen south (~30%) filled gray. Replaces a pre-New Horizons stand-in derived from a Ganymede map.',
    coverage: 'New Horizons saw only one side of Pluto up close. Plain gray areas have no imagery in this map.',
    displayNote: `Resized for display. ${GRAY_FILL}`,
  },
  ceres: {
    credit: 'NASA/JPL-Caltech/UCLA/MPS/DLR/IDA, via USGS Astrogeology', sourceUrl: 'https://astrogeology.usgs.gov/search/map/ceres_dawn_fc_global_mosaic_400m', licenseUrl: USGS_TERMS,
    notes: 'USGS Dawn Framing Camera 400 m grayscale global mosaic; "please cite authors". Replaces Solar System Scope\'s fictional Ceres.',
    displayNote: 'Resized for display from a spacecraft photo mosaic.',
  },
};

function solarSystemScopeAsset(bodyId: keyof typeof solarSystemScopeFiles): TextureAsset {
  const file = solarSystemScopeFiles[bodyId];
  return {
    id: `${bodyId}-diffuse`, bodyId, kind: 'diffuse',
    variants: [{ path: `/textures/2k/${bodyId}_diffuse.jpg`, width: 2048, height: 1024 }],
    provenance: {
      status: 'verified', credit: 'Solar System Scope', licenseUrl: CC_BY_4,
      sourceUrl: `https://www.solarsystemscope.com/textures/download/${file}.jpg`,
      notes: `Byte-identical to Solar System Scope ${file}.jpg. Publisher notes colors are slightly saturated and unmapped gaps are filled with fictional terrain.`,
    },
  };
}

const uranianMoonIds = ['miranda', 'ariel', 'titania', 'oberon', 'umbriel'] as const;

export const textureManifest: readonly TextureAsset[] = [
  ...(Object.keys(solarSystemScopeFiles) as (keyof typeof solarSystemScopeFiles)[]).map(solarSystemScopeAsset),
  ...Object.entries(publicDomainMaps).map(([bodyId, map]): TextureAsset => ({
    id: `${bodyId}-diffuse`, bodyId, kind: 'diffuse',
    variants: [
      { path: `/textures/1k/${bodyId}_diffuse.jpg`, width: 1024, height: 512 },
      { path: `/textures/2k/${bodyId}_diffuse.jpg`, width: 2048, height: 1024 },
    ],
    provenance: { status: 'verified', credit: map.credit, sourceUrl: map.sourceUrl, licenseUrl: map.licenseUrl, notes: map.notes },
    coverage: map.coverage,
    displayNote: map.displayNote,
  })),
  {
    id: 'hyperion-diffuse', bodyId: 'hyperion', kind: 'diffuse',
    variants: [{ path: '/textures/2k/hyperion_diffuse.jpg', width: 2048, height: 1024 }],
    provenance: {
      status: 'verified', credit: 'ItzImcool (CelestiaContent), CC BY 4.0',
      sourceUrl: 'https://github.com/CelestiaProject/CelestiaContent/blob/master/textures/medres/hyperion.jpg',
      licenseUrl: CC_BY_4,
      notes: 'Byte-identical to CelestiaContent textures/medres/hyperion.jpg (SPDX CC-BY-4.0, ItzImcool). Retouched reprojection of Cassini images made for an irregular shape model; features distort on a sphere.',
    },
    displayNote: 'A fan-made map built from Cassini pictures, used unchanged.',
  },
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
    displayNote: 'Resized for display. Areas without imagery are plain gray; no terrain was invented.',
  })),
  {
    id: 'amalthea-diffuse', bodyId: 'amalthea', kind: 'diffuse',
    variants: [
      { path: '/textures/1k/amalthea_diffuse.jpg', width: 1024, height: 512 },
      { path: '/textures/2k/amalthea_diffuse.jpg', width: 2048, height: 1024, detailOnly: true },
    ],
    provenance: {
      status: 'verified', credit: 'Phil Stooke, Stooke Small Bodies Maps V2.0, NASA Planetary Data System',
      sourceUrl: 'https://sbnarchive.psi.edu/pds3/multi_mission/MULTI_SA_MULTI_6_STOOKEMAPS_V2_0/document/aamapdesc.html',
      notes: 'Public-domain PDS archive product; citation requested. Grayscale shaded-relief drawing from Voyager images, not a photomosaic. Resized only. Source hash and processing: docs/assets/small-moons.md.',
    },
    coverage: 'This is a hand-drawn relief map made from Voyager pictures, not a photo. Amalthea\'s real surface is reddish.',
    displayNote: 'Resized for display. The drawing is gray; the app adds a slight reddish tint.',
  },
  ...(['nix', 'hydra'] as const).map((bodyId): TextureAsset => ({
    id: `${bodyId}-diffuse`, bodyId, kind: 'diffuse',
    variants: bodyId === 'nix'
      ? [
          { path: '/textures/1k/nix_diffuse.jpg', width: 1024, height: 512 },
          { path: '/textures/2k/nix_diffuse.jpg', width: 2048, height: 1024, detailOnly: true },
        ]
      : [{ path: '/textures/1k/hydra_diffuse.jpg', width: 1024, height: 512 }],
    provenance: {
      status: 'verified', credit: 'Askaniy (CC BY 3.0), from NASA/JHUAPL/SwRI New Horizons images',
      sourceUrl: bodyId === 'nix'
        ? 'https://www.deviantart.com/askaniy/art/Nix-Color-Texture-Maps-926588947'
        : 'https://www.deviantart.com/askaniy/art/Hydra-Color-Texture-Maps-926623163',
      licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
      notes: 'Creator\'s gray-calibrated true-color variant: New Horizons LORRI/MVIC images projected onto the Porter et al. shape model. Resized and re-encoded only. Source hash and processing: docs/assets/small-moons.md.',
    },
    coverage: 'New Horizons saw one side of this tiny moon from far away. Smooth, blurry areas were barely seen.',
    displayNote: 'Resized for display from the creator\'s map; no terrain was added.',
  })),
  ...(['proteus', 'nereid', 'styx', 'kerberos', 'himalia', 'valetudo', 'carme', 'pasiphae'] as const).map((bodyId): TextureAsset => ({
    id: `${bodyId}-diffuse`, bodyId, kind: 'diffuse',
    variants: [
      { path: `/textures/1k/${bodyId}_diffuse.jpg`, width: 1024, height: 512 },
      { path: `/textures/2k/${bodyId}_diffuse.jpg`, width: 2048, height: 1024, detailOnly: true },
    ],
    provenance: {
      status: 'verified', credit: 'Artist\'s illustration generated for Space Explorer',
      notes: 'Procedural noise and craters from scripts/assets/build_illustrated_moons.py; only mean brightness follows measurements. Not a map. See docs/assets/illustrated-moons.md.',
    },
    coverage: bodyId === 'proteus'
      ? 'Artist\'s illustration. Voyager 2 took only blurry pictures of Proteus, so these craters are imagined.'
      : bodyId === 'himalia'
        ? 'Artist\'s illustration. Passing spacecraft saw Himalia as only a few pixels, so this surface is imagined.'
        : `Artist's illustration. No spacecraft has seen ${bodyId[0].toUpperCase()}${bodyId.slice(1)} up close, so this surface is imagined.`,
    displayNote: ILLUSTRATION_NOTES[bodyId] ?? 'Made up to show what a small, cratered moon might look like. Its brightness matches measurements.',
    illustration: true,
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
  {
    id: 'nasa-celestial-milky-way', kind: 'sky',
    variants: [
      { path: '/textures/skybox/galaxy_milky_way_2k.jpg', width: 2048, height: 1024 },
      { path: '/textures/skybox/galaxy_milky_way_4k.jpg', width: 4096, height: 2048, detailOnly: true },
    ],
    provenance: {
      status: 'verified',
      credit: 'NASA/Goddard Space Flight Center Scientific Visualization Studio. Gaia DR2: ESA/Gaia/DPAC.',
      sourceUrl: 'https://svs.gsfc.nasa.gov/4851/',
      licenseUrl: 'https://svs.gsfc.nasa.gov/help/',
      notes: 'NASA SVS public-domain reuse policy; source hash and exact display enhancement recipe in docs/assets/nasa-celestial-sky.md. J2000 celestial frame; Hipparcos/Tycho bright foreground omitted.',
    },
    coverage: 'Full celestial sphere in ICRF/J2000 RA/Dec. Display-enhanced faint-star catalogue background, not a naked-eye brightness simulation.',
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
