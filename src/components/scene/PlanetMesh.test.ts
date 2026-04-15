import { describe, it, expect } from 'vitest';

/**
 * Unit tests for the rotation math used in PlanetMesh.tsx.
 *
 * PlanetMesh is a React Three Fiber component that's difficult to unit test
 * directly. Instead we test the pure math formulas extracted from useFrame:
 *
 * 1. Earth: GMST hours -> rotation radians
 * 2. Other planets: elapsed time from J2000 -> rotation radians
 * 3. Retrograde planets (negative rotationPeriod) rotate opposite direction
 */

const TWO_PI = Math.PI * 2;
const J2000_MS = 946684800000; // 2000-01-01T00:00:00Z

/** Earth rotation from GMST (as used in PlanetMesh for Earth in orrery mode) */
function earthRotationFromGMST(gmstHours: number): number {
  return gmstHours * (TWO_PI / 24);
}

/** Generic planet rotation from simulation time (as used in PlanetMesh for non-Earth planets) */
function planetRotationFromTime(simTimeMs: number, rotationPeriodHours: number): number {
  const elapsed = simTimeMs - J2000_MS;
  const periodMs = Math.abs(rotationPeriodHours) * 3600 * 1000;
  const direction = rotationPeriodHours < 0 ? -1 : 1;
  return periodMs > 0 ? (elapsed / periodMs) * TWO_PI * direction : 0;
}

describe('Earth GMST rotation', () => {
  it('returns 0 radians for GMST = 0 hours', () => {
    expect(earthRotationFromGMST(0)).toBe(0);
  });

  it('returns PI for GMST = 12 hours (half rotation)', () => {
    expect(earthRotationFromGMST(12)).toBeCloseTo(Math.PI, 10);
  });

  it('returns 2*PI for GMST = 24 hours (full rotation)', () => {
    expect(earthRotationFromGMST(24)).toBeCloseTo(TWO_PI, 10);
  });

  it('maps 6 hours to PI/2 (quarter rotation)', () => {
    expect(earthRotationFromGMST(6)).toBeCloseTo(Math.PI / 2, 10);
  });

  it('is linear — doubling GMST doubles rotation', () => {
    const r1 = earthRotationFromGMST(3);
    const r2 = earthRotationFromGMST(6);
    expect(r2).toBeCloseTo(r1 * 2, 10);
  });
});

describe('Planet rotation from J2000 epoch', () => {
  it('returns 0 at exactly J2000 epoch', () => {
    expect(planetRotationFromTime(J2000_MS, 24)).toBe(0);
  });

  it('completes one full rotation after one rotationPeriod', () => {
    const periodHours = 24; // Earth-like
    const oneFullPeriodMs = periodHours * 3600 * 1000;
    const rotation = planetRotationFromTime(J2000_MS + oneFullPeriodMs, periodHours);
    expect(rotation).toBeCloseTo(TWO_PI, 10);
  });

  it('completes half rotation after half a period', () => {
    const periodHours = 10;
    const halfPeriodMs = (periodHours * 3600 * 1000) / 2;
    const rotation = planetRotationFromTime(J2000_MS + halfPeriodMs, periodHours);
    expect(rotation).toBeCloseTo(Math.PI, 10);
  });

  it('handles Mars rotation period (~24.6 hours)', () => {
    const marsRotationPeriod = 24.6;
    const twoPeriods = marsRotationPeriod * 3600 * 1000 * 2;
    const rotation = planetRotationFromTime(J2000_MS + twoPeriods, marsRotationPeriod);
    expect(rotation).toBeCloseTo(TWO_PI * 2, 5);
  });

  it('handles Jupiter fast rotation (~9.9 hours)', () => {
    const jupiterRotationPeriod = 9.93;
    const onePeriod = jupiterRotationPeriod * 3600 * 1000;
    const rotation = planetRotationFromTime(J2000_MS + onePeriod, jupiterRotationPeriod);
    expect(rotation).toBeCloseTo(TWO_PI, 5);
  });

  it('returns 0 for zero rotation period', () => {
    expect(planetRotationFromTime(J2000_MS + 1000000, 0)).toBe(0);
  });
});

describe('Retrograde rotation (negative rotationPeriod)', () => {
  it('Venus (negative period) rotates opposite to prograde planets', () => {
    const simTime = J2000_MS + 100 * 3600 * 1000; // 100 hours after J2000
    const progradeRotation = planetRotationFromTime(simTime, 243);
    const retrogradeRotation = planetRotationFromTime(simTime, -243);
    // Same magnitude, opposite sign
    expect(Math.abs(retrogradeRotation)).toBeCloseTo(Math.abs(progradeRotation), 10);
    expect(retrogradeRotation).toBeLessThan(0);
    expect(progradeRotation).toBeGreaterThan(0);
  });

  it('Uranus (negative period) rotates in reverse', () => {
    const simTime = J2000_MS + 50 * 3600 * 1000;
    const rotation = planetRotationFromTime(simTime, -17.2);
    expect(rotation).toBeLessThan(0);
  });

  it('direction sign is correct for various planets', () => {
    const simTime = J2000_MS + 24 * 3600 * 1000; // 1 day after J2000
    // Prograde planets
    expect(planetRotationFromTime(simTime, 24.6)).toBeGreaterThan(0); // Mars
    expect(planetRotationFromTime(simTime, 9.93)).toBeGreaterThan(0); // Jupiter
    // Retrograde planets
    expect(planetRotationFromTime(simTime, -5832.5)).toBeLessThan(0); // Venus
    expect(planetRotationFromTime(simTime, -17.2)).toBeLessThan(0); // Uranus
  });
});

describe('Rotation before J2000 (negative elapsed time)', () => {
  it('gives negative rotation for prograde planets before J2000', () => {
    const beforeJ2000 = J2000_MS - 24 * 3600 * 1000; // 1 day before
    const rotation = planetRotationFromTime(beforeJ2000, 24);
    expect(rotation).toBeCloseTo(-TWO_PI, 5);
  });

  it('gives positive rotation for retrograde planets before J2000', () => {
    const beforeJ2000 = J2000_MS - 24 * 3600 * 1000;
    const rotation = planetRotationFromTime(beforeJ2000, -24);
    expect(rotation).toBeCloseTo(TWO_PI, 5);
  });
});
