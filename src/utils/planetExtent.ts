import type { Planet } from '../types/celestialBody';

export function planetRingOuterMultiplier(planetId: string): number {
  return planetId === 'saturn' ? 2.4 : planetId === 'uranus' ? 1.9 : 1;
}

export function planetDisplayExtent(planet: Planet): number {
  return planet.visualRadius * planetRingOuterMultiplier(planet.id);
}
