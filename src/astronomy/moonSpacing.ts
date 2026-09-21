import { getMoonsByPlanet } from '../data/moons';
import { planets, getPlanetById } from '../data/planets';
import type { Moon } from '../types/celestialBody';
import { planetDisplayExtent } from '../utils/planetExtent';

/** Apply one softened physical diameter ratio so tiny moons remain visible. */
export function orreryMoonBodyRadius(moon: Pick<Moon, 'diameter' | 'parentPlanetId'>): number {
  const planet = getPlanetById(moon.parentPlanetId);
  if (!planet) throw new Error(`Missing parent planet: ${moon.parentPlanetId}`);
  return planet.visualRadius * (0.04 + 0.5 * Math.pow(moon.diameter / planet.diameter, 0.6));
}

function bodyExtent(moon: Moon): number {
  // Bound the irregular mesh's stretch and four possible lobes.
  return orreryMoonBodyRadius(moon) * (moon.shape === 'irregular' ? 2.6 : 1);
}

const profiles = new Map<string, { orbit: number; hitLimit: number }>();
for (const planet of planets) {
  const system = getMoonsByPlanet(planet.id).sort((a, b) => a.distanceFromPlanet - b.distanceFromPlanet);
  const orbits: number[] = [];
  system.forEach((moon, index) => {
    const spread = Math.log2(moon.distanceFromPlanet / system[0].distanceFromPlanet) * 0.6;
    const desired = planetDisplayExtent(planet) + planet.visualRadius * (1.25 + spread);
    const clearance = index === 0 ? 0 : orbits[index - 1] + bodyExtent(system[index - 1]) + bodyExtent(moon) + planet.visualRadius * 0.1;
    orbits.push(Math.max(desired, clearance));
  });
  system.forEach((moon, index) => {
    const neighborLimit = (otherIndex: number) => {
      if (otherIndex < 0 || otherIndex >= system.length) return Infinity;
      const gap = Math.abs(orbits[index] - orbits[otherIndex]);
      return gap * bodyExtent(moon) / (bodyExtent(moon) + bodyExtent(system[otherIndex])) * 0.95;
    };
    profiles.set(moon.id, {
      orbit: orbits[index],
      hitLimit: Math.min(orbits[index] - planet.visualRadius - 0.02, neighborLimit(index - 1), neighborLimit(index + 1)),
    });
  });
}

function profile(moon: Moon) {
  const value = profiles.get(moon.id);
  if (!value) throw new Error(`Missing Orrery moon profile: ${moon.id}`);
  return value;
}

/** Illustrative local spacing, independent of the Sun-centered AU compression. */
export function orreryMoonOrbitRadius(moon: Moon): number {
  return profile(moon).orbit;
}

/** Keep enlarged touch targets clear of the parent and adjacent moon orbits. */
export function orreryMoonHitRadius(moon: Moon, visualRadius: number): number {
  return Math.min(Math.max(visualRadius * 3, 0.3), profile(moon).hitLimit);
}
