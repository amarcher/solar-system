import { describe, expect, it } from 'vitest';
import { moons, getMoonById, getMoonsByPlanet } from '../data/moons';
import { planets, getPlanetById } from '../data/planets';
import { planetDisplayExtent } from '../utils/planetExtent';
import { moonVisualRadius } from '../utils/moonFraming';
import { scaleAU } from './realisticScale';
import { orreryMoonBodyRadius, orreryMoonHitRadius, orreryMoonOrbitRadius } from './moonSpacing';

describe('shared Orrery moon treatment', () => {
  it('moves Earth outward and both Mars moons inward without reaching the neighboring mean planetary orbit', () => {
    const earth = getPlanetById('earth')!;
    const mars = getPlanetById('mars')!;
    const gap = scaleAU(mars.distanceFromSun) - scaleAU(earth.distanceFromSun);
    const moon = getMoonById('moon')!;
    expect(orreryMoonOrbitRadius(moon)).toBeGreaterThan(0.48);
    for (const body of [moon, ...getMoonsByPlanet('mars')]) {
      expect(orreryMoonOrbitRadius(body)).toBeLessThan(body.orbitRadius);
      expect(orreryMoonOrbitRadius(body) + orreryMoonBodyRadius(body)).toBeLessThan(gap);
    }
  });

  it('gives every innermost moon the same surface gap relative to its parent, allowing for rings', () => {
    for (const planet of planets) {
      const system = getMoonsByPlanet(planet.id).sort((a, b) => a.distanceFromPlanet - b.distanceFromPlanet);
      if (!system.length) continue;
      const gap = orreryMoonOrbitRadius(system[0]) - planetDisplayExtent(planet);
      expect(gap / planet.visualRadius).toBeCloseTo(1.25);
      for (let i = 1; i < system.length; i++) {
        const previous = system[i - 1];
        const current = system[i];
        const separation = orreryMoonOrbitRadius(current) - orreryMoonOrbitRadius(previous);
        const extent = (body: typeof current) => orreryMoonBodyRadius(body) * (body.shape === 'irregular' ? 2.6 : 1);
        expect(separation).toBeGreaterThan(extent(previous) + extent(current));
        expect(separation).toBeGreaterThan(orreryMoonHitRadius(previous, orreryMoonBodyRadius(previous)) + orreryMoonHitRadius(current, orreryMoonBodyRadius(current)));
      }
    }
  });

  it.each(moons.map(moon => [moon.id, moon] as const))('keeps %s and its touch target clear of its parent', (_, moon) => {
    const planet = getPlanetById(moon.parentPlanetId)!;
    const radius = orreryMoonBodyRadius(moon);
    const orbit = orreryMoonOrbitRadius(moon);
    // Conservative bound for the irregular meshes' stretch and lobes.
    expect(orbit - radius * 2.6).toBeGreaterThan(planetDisplayExtent(planet));
    const hit = orreryMoonHitRadius(moon, radius);
    expect(hit).toBeGreaterThan(radius);
    expect(orbit - hit).toBeGreaterThan(planet.visualRadius);
    expect(moonVisualRadius(moon.diameter, moon.id, 'orrery')).toBe(radius);
  });

  it('uses the same relative size for the same physical diameter ratio around any parent', () => {
    for (const ratio of [0.001, 0.01, 0.1, 0.5]) {
      const sizes = planets.map(planet => orreryMoonBodyRadius({ parentPlanetId: planet.id, diameter: planet.diameter * ratio }) / planet.visualRadius);
      sizes.forEach(size => expect(size).toBeCloseTo(sizes[0], 12));
    }
  });

  it('preserves size ordering without making small moons identical', () => {
    for (const planet of planets) {
      const system = getMoonsByPlanet(planet.id).sort((a, b) => a.diameter - b.diameter);
      for (let i = 1; i < system.length; i++) {
        expect(orreryMoonBodyRadius(system[i])).toBeGreaterThan(orreryMoonBodyRadius(system[i - 1]));
      }
    }
  });
});
