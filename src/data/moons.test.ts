import { describe, it, expect } from 'vitest';
import { moons, getMoonsByPlanet, getMoonById } from './moons';

describe('moon rotation data', () => {
  it('all moons have a positive orbital period', () => {
    for (const moon of moons) {
      expect(moon.orbitalPeriod, `${moon.name} orbitalPeriod`).toBeGreaterThan(0);
    }
  });

  it('tidally locked moons have no explicit rotationPeriod or chaoticRotation', () => {
    const tidallyLocked = moons.filter(m => !m.rotationPeriod && !m.chaoticRotation);
    // The majority of moons should be tidally locked
    expect(tidallyLocked.length).toBeGreaterThanOrEqual(23);
  });

  it('chaotic rotators are flagged correctly', () => {
    const chaotic = moons.filter(m => m.chaoticRotation);
    const chaoticIds = chaotic.map(m => m.id).sort();
    expect(chaoticIds).toEqual(['hydra', 'hyperion', 'nix']);
  });

  it('Nereid has an explicit fast rotation period', () => {
    const nereid = moons.find(m => m.id === 'nereid')!;
    expect(nereid.rotationPeriod).toBe(11.52);
    // Nereid spins much faster than it orbits
    expect(nereid.rotationPeriod).toBeLessThan(nereid.orbitalPeriod * 24);
  });

  it('chaotic moons do not have rotationPeriod set', () => {
    const chaotic = moons.filter(m => m.chaoticRotation);
    for (const moon of chaotic) {
      expect(moon.rotationPeriod, `${moon.name} should not have rotationPeriod`).toBeUndefined();
    }
  });

  describe('effective rotation period computation', () => {
    /** Mirrors the logic in MoonOrbit.tsx */
    function effectivePeriodHours(moon: typeof moons[number]): number | null {
      if (moon.chaoticRotation) return null;
      return moon.rotationPeriod ?? (moon.orbitalPeriod * 24);
    }

    it('tidally locked moons have rotation period equal to orbital period in hours', () => {
      const earthMoon = moons.find(m => m.id === 'moon')!;
      expect(effectivePeriodHours(earthMoon)).toBeCloseTo(27.32 * 24, 0);
    });

    it('Nereid uses its explicit rotation period', () => {
      const nereid = moons.find(m => m.id === 'nereid')!;
      expect(effectivePeriodHours(nereid)).toBe(11.52);
    });

    it('chaotic moons return null (no fixed period)', () => {
      const hyperion = moons.find(m => m.id === 'hyperion')!;
      expect(effectivePeriodHours(hyperion)).toBeNull();
    });
  });
});

describe('getMoonsByPlanet', () => {
  it('returns Jupiter moons', () => {
    const jupiterMoons = getMoonsByPlanet('jupiter');
    expect(jupiterMoons.length).toBeGreaterThanOrEqual(4);
    expect(jupiterMoons.map(m => m.id)).toContain('io');
  });
});

describe('getMoonById', () => {
  it('finds a moon by id', () => {
    const titan = getMoonById('titan');
    expect(titan).toBeDefined();
    expect(titan!.name).toBe('Titan');
  });

  it('returns undefined for unknown id', () => {
    expect(getMoonById('death-star')).toBeUndefined();
  });
});
