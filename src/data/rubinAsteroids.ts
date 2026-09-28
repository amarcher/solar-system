import type { KeplerElements } from '../astronomy/keplerOrbit';
import { scaleAU } from '../astronomy/realisticScale';
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
  sizeLabel?: string;
}

export interface RubinAsteroid extends Omit<RubinAsteroidEntry, 'designation'> {
  id: string;
  designation: string;
  elements: KeplerElements;
  /** Orbit from a short arc or poor fit (JPL condition code 6–9): a best guess. */
  orbitEstimated: boolean;
  neo: boolean;
}

const ENTRIES: RubinAsteroidEntry[] = [
  {
    designation: '2025 MN45',
    name: '2025 MN45',
    kind: 'main-belt',
    rubinDiscovered: true,
    headline: 'The speedy spinner',
    blurb: 'A mountain-sized rock that spins all the way around in under 2 minutes, faster than any other known asteroid this big. It must be solid rock; a pile of rubble would fly apart.',
    sizeLabel: 'About 710 m wide',
  },
  {
    designation: '2025 LS2',
    name: '2025 LS2',
    kind: 'distant',
    rubinDiscovered: true,
    headline: 'The long-distance traveler',
    blurb: 'Its stretched-out orbit swings about 1,000 times farther from the Sun than Earth. One trip around takes about 12,000 years.',
  },
  {
    designation: '2025 NE552',
    name: '2025 NE552',
    kind: 'distant',
    rubinDiscovered: true,
    headline: 'A big new world?',
    blurb: 'One of the brightest, and probably biggest, faraway objects Rubin has found. It could be several hundred kilometers wide. Astronomers have only watched it for a few weeks, so its path is still a best guess.',
  },
  {
    designation: '2026 BS14',
    name: '2026 BS14',
    kind: 'distant',
    rubinDiscovered: true,
    headline: 'The tilted world',
    blurb: 'A large icy object beyond Neptune whose orbit is tilted more than 50 degrees, steeply compared with the flat paths of the planets.',
  },
  {
    designation: '2025 PQ124',
    name: '2025 PQ124',
    kind: 'near-earth',
    rubinDiscovered: true,
    headline: 'Hiding in old photos',
    blurb: 'A near-Earth asteroid that never gets closer to the Sun than Earth does. After Rubin spotted it, astronomers found it in pictures taken back in 2004.',
  },
  {
    designation: '2025 OP161',
    name: '2025 OP161',
    kind: 'near-earth',
    rubinDiscovered: true,
    headline: 'From Venus to the asteroid belt',
    blurb: 'Its long oval path dips inside the orbit of Venus, then swings all the way out past Mars into the asteroid belt.',
  },
  {
    designation: '2025 OD43',
    name: '2025 OD43',
    kind: 'near-earth',
    rubinDiscovered: true,
    headline: 'Almost an Earth year',
    blurb: 'It takes about 389 days to go around the Sun, almost exactly as long as Earth takes.',
  },
  {
    designation: '2025 OC338',
    name: '2025 OC338',
    kind: 'near-earth',
    rubinDiscovered: true,
    headline: 'Bus-sized',
    blurb: 'One of the tiniest things Rubin has found: a space rock roughly as long as a school bus. Seeing something that small, that far away, is really hard.',
    sizeLabel: 'Roughly 10 m wide',
  },
  {
    designation: 'P/2026 N2',
    name: 'P/2026 N2',
    kind: 'comet',
    rubinDiscovered: true,
    headline: "Rubin's comet",
    blurb: 'A comet Rubin found in July 2026. It loops around the Sun every 5 years or so, staying between Mars and Jupiter.',
  },
  {
    designation: '2025 MP34',
    name: '2025 MP34',
    kind: 'trojan',
    rubinDiscovered: true,
    headline: "Jupiter's traveling companion",
    blurb: "A Trojan asteroid: it shares Jupiter's orbit, riding in a swarm that travels ahead of or behind the giant planet.",
    sizeLabel: 'A few km wide',
  },
  {
    designation: '2025 NE203',
    name: '2025 NE203',
    kind: 'centaur',
    rubinDiscovered: true,
    headline: "Neptune's neighbor",
    blurb: 'An icy wanderer that circles the Sun at almost the same distance as Neptune.',
  },
  {
    designation: '2025 PN7',
    name: '2025 PN7',
    kind: 'near-earth',
    rubinDiscovered: false,
    headline: "Earth's quasi-moon",
    blurb: "It goes around the Sun in step with Earth, so from here it seems to stay near us. But it isn't a real moon: it orbits the Sun, not Earth.",
  },
  {
    designation: 'C/2025 N1',
    name: '3I/ATLAS',
    kind: 'interstellar',
    rubinDiscovered: false,
    headline: 'Visitor from another star',
    blurb: 'Only the third object ever found that came from outside our solar system. Rubin photographed it by accident 10 days before anyone knew it was there. It is passing through and will never come back.',
  },
  {
    designation: '434620',
    name: '434620 (2005 VD)',
    kind: 'centaur',
    rubinDiscovered: false,
    headline: 'Going backwards',
    blurb: 'It orbits the Sun the opposite way from every planet.',
  },
  {
    designation: '289227',
    name: '289227 (2004 XY60)',
    kind: 'near-earth',
    rubinDiscovered: false,
    headline: 'Sun-skimmer',
    blurb: "It swoops in to about a third of Mercury's distance from the Sun, far closer than any planet gets.",
  },
  {
    designation: '535844',
    name: '535844 (2015 BY310)',
    kind: 'near-earth',
    rubinDiscovered: false,
    headline: 'Flyby in 2027',
    blurb: 'It will safely pass Earth on March 4, 2027, about 9 times farther away than the Moon. It spins once every 5 and a half minutes.',
  },
  {
    designation: '25629',
    name: '25629 Mukherjee',
    kind: 'main-belt',
    rubinDiscovered: false,
    headline: 'The super-slow spinner',
    blurb: 'One turn takes about 172 days, almost half a year. A single day there would outlast two whole summer vacations.',
    sizeLabel: 'About 2.6 km wide',
  },
];

export const rubinAsteroids: RubinAsteroid[] = ENTRIES.map((entry) => {
  const orbit = orbits[entry.designation];
  return {
    ...entry,
    id: entry.designation.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    elements: { e: orbit.e, q: orbit.q, i: orbit.i, om: orbit.om, w: orbit.w, tpJd: orbit.tpJd },
    orbitEstimated: orbit.conditionCode !== null && orbit.conditionCode >= 6,
    neo: orbit.neo,
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
