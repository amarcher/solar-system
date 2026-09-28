import type { KeplerElements } from '../astronomy/keplerOrbit';
import { scaleAU } from '../astronomy/realisticScale';
import type { RockComposition } from '../utils/asteroidRock';
import orbits from './rubinAsteroidOrbits.json';

/**
 * Hand-picked objects from the Vera C. Rubin Observatory's early survey data
 * (MPC observatory code X05). Research, counts and sources:
 * docs/rubin-asteroids-research-2026-09-28.md.
 *
 * `rubinDiscovered` is true only where MPC records carry Rubin's discovery
 * flag; everything else was imaged by Rubin but found by someone earlier.
 * Orbits come from JPL SBDB via scripts/rubin/fetch-orbits.mjs.
 */

export type RubinObjectKind =
  | 'near-earth'
  | 'main-belt'
  | 'trojan'
  | 'centaur'
  | 'distant'
  | 'comet'
  | 'interstellar';

export const RUBIN_KIND_LABELS: Record<RubinObjectKind, string> = {
  'near-earth': 'Near-Earth asteroid',
  'main-belt': 'Main-belt asteroid',
  trojan: 'Jupiter Trojan',
  centaur: 'Centaur',
  distant: 'Beyond Neptune',
  comet: 'Comet',
  interstellar: 'Interstellar visitor',
};

export const RUBIN_KIND_COLORS: Record<RubinObjectKind, string> = {
  'near-earth': '#ff9f5a',
  'main-belt': '#d8c7a4',
  trojan: '#e7b45c',
  centaur: '#9fd6a4',
  distant: '#8fc3ff',
  comet: '#6ff0ea',
  interstellar: '#e98cff',
};

interface RubinAsteroidEntry {
  /** JPL search key; also the key in rubinAsteroidOrbits.json. */
  designation: keyof typeof orbits;
  name: string;
  kind: RubinObjectKind;
  rubinDiscovered: boolean;
  /** Short, kid-readable title shown in the list. */
  headline: string;
  blurb: string;
  /** Likely make-up, inferred from orbit family unless measured; drives the 3D look. */
  composition: RockComposition;
  /** Override the H-magnitude size estimate (published size), km. */
  diameterKm?: number;
  /** Kid-readable composition line when it says more than the family default. */
  compositionNote?: string;
}

export interface RubinAsteroid extends Omit<RubinAsteroidEntry, 'designation'> {
  id: string;
  designation: string;
  elements: KeplerElements;
  /** Orbit from a short arc or poor fit (JPL condition code 6–9): a best guess. */
  orbitEstimated: boolean;
  neo: boolean;
  /** Best available diameter: published, JPL, or estimated from brightness. */
  diameterKm: number;
  diameterEstimated: boolean;
  /** Card line, e.g. "About 220 km across (estimated from its brightness)". */
  sizeText: string;
  /** Measured spin period, hours; null when unknown. */
  rotationHours: number | null;
}

/** Typical reflectivity by make-up, for turning brightness (H) into size. */
const ALBEDO: Record<RockComposition, number> = { stony: 0.2, carbon: 0.06, icy: 0.1, comet: 0.04 };

export const COMPOSITION_NOTES: Record<RockComposition, string> = {
  stony: 'Probably stony rock, like most asteroids near the Sun.',
  carbon: 'Probably dark rock full of carbon, one of the darkest materials in the solar system.',
  icy: 'Probably ice mixed with rock, turned reddish by billions of years of sunlight and space radiation.',
  comet: 'A comet: a dark lump of ice and dust that grows a glowing, fuzzy cloud when it warms up near the Sun.',
};

const ENTRIES: RubinAsteroidEntry[] = [
  {
    designation: '2025 MN45',
    name: '2025 MN45',
    kind: 'main-belt',
    rubinDiscovered: true,
    headline: 'The speedy spinner',
    blurb: 'A mountain-sized rock that spins all the way around in under 2 minutes, faster than any other known asteroid this big. It must be solid rock; a pile of rubble would fly apart.',
    composition: 'stony', diameterKm: 0.71, compositionNote: 'Solid rock. It spins too fast to be a loose pile of rubble.',
  },
  {
    designation: '2025 LS2',
    name: '2025 LS2',
    kind: 'distant',
    rubinDiscovered: true,
    headline: 'The long-distance traveler',
    blurb: 'Its stretched-out orbit swings about 1,000 times farther from the Sun than Earth. One trip around takes about 12,000 years.',
    composition: 'icy',
  },
  {
    designation: '2025 NE552',
    name: '2025 NE552',
    kind: 'distant',
    rubinDiscovered: true,
    headline: 'A big new world?',
    blurb: 'One of the brightest, and probably biggest, faraway objects Rubin has found. It could be several hundred kilometers wide. Astronomers have only watched it for a few weeks, so its path is still a best guess.',
    composition: 'icy',
  },
  {
    designation: '2026 BS14',
    name: '2026 BS14',
    kind: 'distant',
    rubinDiscovered: true,
    headline: 'The tilted world',
    blurb: 'A large icy object beyond Neptune whose orbit is tilted more than 50 degrees, steeply compared with the flat paths of the planets.',
    composition: 'icy',
  },
  {
    designation: '2025 PQ124',
    name: '2025 PQ124',
    kind: 'near-earth',
    rubinDiscovered: true,
    headline: 'Hiding in old photos',
    blurb: 'A near-Earth asteroid that never gets closer to the Sun than Earth does. After Rubin spotted it, astronomers found it in pictures taken back in 2004.',
    composition: 'stony',
  },
  {
    designation: '2025 OP161',
    name: '2025 OP161',
    kind: 'near-earth',
    rubinDiscovered: true,
    headline: 'From Venus to the asteroid belt',
    blurb: 'Its long oval path dips inside the orbit of Venus, then swings all the way out past Mars into the asteroid belt.',
    composition: 'stony',
  },
  {
    designation: '2025 OD43',
    name: '2025 OD43',
    kind: 'near-earth',
    rubinDiscovered: true,
    headline: 'Almost an Earth year',
    blurb: 'It takes about 389 days to go around the Sun, almost exactly as long as Earth takes.',
    composition: 'stony',
  },
  {
    designation: '2025 OC338',
    name: '2025 OC338',
    kind: 'near-earth',
    rubinDiscovered: true,
    headline: 'Bus-sized',
    blurb: 'One of the tiniest things Rubin has found: a space rock roughly as long as a school bus. Seeing something that small, that far away, is really hard.',
    composition: 'stony',
  },
  {
    designation: 'P/2026 N2',
    name: 'P/2026 N2',
    kind: 'comet',
    rubinDiscovered: true,
    headline: "Rubin's comet",
    blurb: 'A comet Rubin found in July 2026. It loops around the Sun every 5 years or so, staying between Mars and Jupiter.',
    composition: 'comet',
  },
  {
    designation: '2025 MP34',
    name: '2025 MP34',
    kind: 'trojan',
    rubinDiscovered: true,
    headline: "Jupiter's traveling companion",
    blurb: "A Trojan asteroid: it shares Jupiter's orbit, riding in a swarm that travels ahead of or behind the giant planet.",
    composition: 'carbon',
  },
  {
    designation: '2025 NE203',
    name: '2025 NE203',
    kind: 'centaur',
    rubinDiscovered: true,
    headline: "Neptune's neighbor",
    blurb: 'An icy wanderer that circles the Sun at almost the same distance as Neptune.',
    composition: 'icy',
  },
  {
    designation: '2025 PN7',
    name: '2025 PN7',
    kind: 'near-earth',
    rubinDiscovered: false,
    headline: "Earth's quasi-moon",
    blurb: "It goes around the Sun in step with Earth, so from here it seems to stay near us. But it isn't a real moon: it orbits the Sun, not Earth.",
    composition: 'stony',
  },
  {
    designation: 'C/2025 N1',
    name: '3I/ATLAS',
    kind: 'interstellar',
    rubinDiscovered: false,
    headline: 'Visitor from another star',
    blurb: 'Only the third object ever found that came from outside our solar system. Rubin photographed it by accident 10 days before anyone knew it was there. It is passing through and will never come back.',
    composition: 'comet', compositionNote: 'An icy comet from another star system. As it passed the Sun it grew a glowing cloud and tail.',
  },
  {
    designation: '434620',
    name: '434620 (2005 VD)',
    kind: 'centaur',
    rubinDiscovered: false,
    headline: 'Going backwards',
    blurb: 'It orbits the Sun the opposite way from every planet.',
    composition: 'carbon',
  },
  {
    designation: '289227',
    name: '289227 (2004 XY60)',
    kind: 'near-earth',
    rubinDiscovered: false,
    headline: 'Sun-skimmer',
    blurb: "It swoops in to about a third of Mercury's distance from the Sun, far closer than any planet gets.",
    composition: 'stony',
  },
  {
    designation: '535844',
    name: '535844 (2015 BY310)',
    kind: 'near-earth',
    rubinDiscovered: false,
    headline: 'Flyby in 2027',
    blurb: 'It will safely pass Earth on March 4, 2027, about 9 times farther away than the Moon. It spins once every 5 and a half minutes.',
    composition: 'stony',
  },
  {
    designation: '25629',
    name: '25629 Mukherjee',
    kind: 'main-belt',
    rubinDiscovered: false,
    headline: 'The super-slow spinner',
    blurb: 'One turn takes about 172 days, almost half a year. A single day there would outlast two whole summer vacations.',
    composition: 'stony',
  },
];

function estimateDiameter(entry: RubinAsteroidEntry, H: number | null, jplDiameterKm: number | null) {
  const measured = entry.diameterKm ?? jplDiameterKm;
  if (measured != null) return { diameterKm: measured, diameterEstimated: false, sizeText: `About ${formatDiameter(measured)} across.` };
  // Comets have no nucleus H in SBDB: draw a typical ~1 km core, claim nothing.
  if (H === null) return { diameterKm: 1, diameterEstimated: true, sizeText: 'The size of its solid core has not been measured yet.' };
  const km = (1329 / Math.sqrt(ALBEDO[entry.composition])) * 10 ** (-H / 5);
  return { diameterKm: km, diameterEstimated: true, sizeText: `About ${formatDiameter(km)} across (estimated from how bright it looks).` };
}

/** "220 km", "400 m", "9 m": rounded to what a kid can hold onto. */
export function formatDiameter(km: number): string {
  const round = (n: number) => (n >= 100 ? Math.round(n / 10) * 10 : n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
  if (km >= 1) return `${round(km).toLocaleString('en-US')} km`;
  const m = km * 1000;
  return `${m >= 100 ? Math.round(m / 10) * 10 : Math.round(m)} m`;
}

export const rubinAsteroids: RubinAsteroid[] = ENTRIES.map((entry) => {
  const orbit = orbits[entry.designation];
  return {
    ...entry,
    id: entry.designation.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    elements: { e: orbit.e, q: orbit.q, i: orbit.i, om: orbit.om, w: orbit.w, tpJd: orbit.tpJd },
    orbitEstimated: orbit.conditionCode !== null && orbit.conditionCode >= 6,
    neo: orbit.neo,
    ...estimateDiameter(entry, orbit.H, orbit.diameterKm),
    rotationHours: orbit.rotationHours ?? (entry.designation === '2025 MN45' ? 1.88 / 60 : null),
  };
});

export function getRubinAsteroidById(id: string): RubinAsteroid | undefined {
  return rubinAsteroids.find((a) => a.id === id);
}

/** Farthest the object gets from the Sun, AU. Interstellar paths are drawn to 40 AU. */
export function aphelionAu(asteroid: RubinAsteroid): number {
  const { e, q } = asteroid.elements;
  return e < 1 ? (q / (1 - e)) * (1 + e) : 40;
}

/** Scene-unit radius of the orrery's (log-compressed) drawing of the path. */
export function rubinSceneExtent(asteroid: RubinAsteroid): number {
  return scaleAU(aphelionAu(asteroid));
}

/** Displayed rock radius (scene units): log of true size, far larger than life, smaller than any planet. */
export function rubinVisualRadius(diameterKm: number): number {
  return Math.min(0.06, Math.max(0.022, 0.02 + 0.007 * Math.log10(diameterKm * 1000)));
}
