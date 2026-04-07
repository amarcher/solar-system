export type PlanetCategory = 'rocky' | 'gas-giant' | 'ice-giant' | 'dwarf';

export interface Planet {
  id: string;
  name: string;
  category: PlanetCategory;
  orderFromSun: number;
  diameter: number;              // km
  mass: string;                  // display string, e.g. "5.97 × 10²⁴ kg"
  gravity: number;               // m/s²
  meanTemperature: number;       // °C
  orbitalPeriod: number;         // Earth days
  rotationPeriod: number;        // hours (negative = retrograde)
  distanceFromSun: number;       // AU
  numberOfMoons: number;
  hasRings: boolean;
  axialTilt: number;             // degrees
  atmosphereComposition: string;
  discoveredBy: string | null;
  yearDiscovered: number | null;
  summary: string;
  funFacts: string[];
  // 3D scene (artistic, not to scale)
  orbitRadius: number;
  orbitSpeed: number;
  visualRadius: number;          // scene units
  color: string;                 // accent/fallback color
}

export interface Moon {
  id: string;
  name: string;
  parentPlanetId: string;
  diameter: number;              // km
  gravity: number;               // m/s²
  meanTemperature: number;       // °C
  orbitalPeriod: number;         // Earth days
  distanceFromPlanet: number;    // km
  discoveredBy: string | null;
  yearDiscovered: number | null;
  notableFeature: string;        // one-liner for list display
  summary: string;
  funFacts: string[];
  orbitRadius: number;           // scaled for mini-scene
  retrograde?: boolean;          // true if moon orbits opposite to planet rotation
  shape?: 'irregular';           // omit for spherical; 'irregular' = potato-shaped
}

export interface SunData {
  name: string;
  diameter: number;              // km
  mass: string;
  surfaceTemperature: number;    // °C
  coreTemperature: string;       // display string
  spectralType: string;
  age: string;
  luminosity: string;
  summary: string;
  funFacts: string[];
  layers: SunLayer[];
}

export interface SunLayer {
  name: string;
  temperature: string;
  description: string;
  color: string;
}

export type NavigationState =
  | { level: 'system' }
  | { level: 'sun' }
  | { level: 'planet'; planetId: string }
  | { level: 'moon'; planetId: string; moonId: string }
  | { level: 'mission'; missionId: string };
