import { describe, expect, it } from 'vitest';
import { getPlanetById } from '../../data/planets';
import { getMoonById } from '../../data/moons';
import { LUNAR_ORRERY_RADIUS } from '../../astronomy/lunarOrrery';
import { orreryMoonBodyRadius } from '../../astronomy/moonSpacing';
import { SOLAR_TIDE_RATIO } from './model';
import { DEFAULT_WATER_PROFILE, inlineWaterProfile, WATER_RIPPLE_AMPLITUDE } from './waterProfiles';

describe('inline water envelope clearance', () => {
  it('clears Earth clouds and the compact Moon for all combined tide and ripple extrema', () => {
    const earth = getPlanetById('earth')!;
    const moon = getMoonById('moon')!;
    const { baseRadius, tidalAmplitude } = inlineWaterProfile('orrery');
    // P2 lies in [-1/2, 1]; positive Moon+Sun weights give conservative bounds
    // for any directions, phase, and source selection. Weighted sines lie in [-1, 1].
    const totalStrength = 1 + SOLAR_TIDE_RATIO;
    const innerRadius = baseRadius - tidalAmplitude * totalStrength / 2 - WATER_RIPPLE_AMPLITUDE;
    const outerRadius = baseRadius + tidalAmplitude * totalStrength + WATER_RIPPLE_AMPLITUDE;
    expect(innerRadius).toBeGreaterThan(1.015);
    expect(innerRadius).toBeCloseTo(1.0176, 3);
    expect(outerRadius * earth.visualRadius).toBeLessThan(LUNAR_ORRERY_RADIUS - orreryMoonBodyRadius(moon));
    expect(outerRadius * earth.visualRadius).toBeCloseTo(0.3847, 3);
  });

  it('retains Explore and legacy lesson exaggeration', () => {
    expect(inlineWaterProfile('artistic')).toBe(DEFAULT_WATER_PROFILE);
    expect(DEFAULT_WATER_PROFILE).toEqual({ baseRadius: 1.18, tidalAmplitude: 0.22 });
    expect(WATER_RIPPLE_AMPLITUDE).toBe(0.004);
  });
});
