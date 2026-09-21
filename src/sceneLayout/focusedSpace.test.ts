import { beforeAll, describe, expect, it } from 'vitest';
import { Group, PerspectiveCamera, Vector3 } from 'three';
import { planets, getPlanetById } from '../data/planets';
import { getMoonsByPlanet } from '../data/moons';
import { planetDisplayExtent } from '../utils/planetExtent';
import { moonVisualRadius } from '../utils/moonFraming';
import { orreryMoonOrbitRadius } from '../astronomy/moonSpacing';
import { preload, getHeliocentricPosition } from '../astronomy/AstronomyService';
import { scaleAUVector } from '../astronomy/realisticScale';
import { advanceFocusSpace, applyFocusSpace, createFocusSpace, distanceToOrbit, focusedParent, focusLayoutShift, localSystemExtent, MAX_FOCUS_EXPANSION, orbitReference, requiredExpansion } from './focusedSpace';

const epoch = Date.parse('2026-09-21T12:00:00Z');
const day = 86_400_000;
const scenePosition = (id: string, ms: number) => {
  const p = getHeliocentricPosition(id, new Date(ms));
  const v = scaleAUVector(p.x, p.z, -p.y);
  return new Vector3(v.x, v.y, v.z);
};
const raw = new Map<string, Vector3>();
const paths = new Map<string, ReturnType<typeof orbitReference>>();
beforeAll(async () => {
  await preload();
  for (const planet of planets) {
    raw.set(planet.id, scenePosition(planet.id, epoch));
    const points = new Float32Array(192 * 3);
    for (let i = 0; i < 192; i++) scenePosition(planet.id, epoch + planet.orbitalPeriod * day * i / 192).toArray(points, i * 3);
    paths.set(planet.id, orbitReference(points));
  }
});

describe('focused heliocentric spacing', () => {
  it('uses segment clearance, including an exact crossing and degenerate segment', () => {
    expect(distanceToOrbit(new Vector3(), new Float32Array([-1, 0, 0, 1, 0, 0, 0, 0, 2]))).toBe(0);
    expect(distanceToOrbit(new Vector3(0, 1, 0), new Float32Array([0, 0, 0, 0, 0, 0]))).toBe(1);
  });
  it('anchors a focused parent and applies exactly one common transform to Sun, planet and orbit points', () => {
    const space = createFocusSpace(); space.raw.set('earth', new Vector3(5, 0, 0));
    for (let i = 0; i < 60; i++) {
      advanceFocusSpace(space, 'earth', 4, 1, 1 / 60, false);
      expect(applyFocusSpace(space, space.raw.get('earth')!, new Vector3()).x).toBeCloseTo(5, 12);
      const sun = applyFocusSpace(space, new Vector3(), new Vector3());
      const point = new Vector3(3, 1, -2);
      const body = applyFocusSpace(space, point, new Vector3());
      expect(body.clone().sub(sun).distanceTo(point.clone().multiplyScalar(space.scale))).toBeLessThan(1e-12);
      expect(focusLayoutShift(space, space.raw.get('earth')!, new Vector3()).length()).toBeLessThan(1e-12);
    }
  });
  it('keeps the shared Orrery moon and legacy Explore geometry at their existing local scale', () => {
    for (const mode of ['artistic', 'orrery'] as const) for (const planet of planets) {
      const moons = getMoonsByPlanet(planet.id);
      const extent = localSystemExtent(planet, moons, mode);
      expect(extent).toBeGreaterThanOrEqual(planetDisplayExtent(planet));
      const parent = new Group(); parent.position.set(25, -4, 100);
      for (const moon of moons) {
        const orbit = mode === 'orrery' ? orreryMoonOrbitRadius(moon) : moon.orbitRadius;
        const radius = moonVisualRadius(moon.diameter, moon.id, mode);
        expect(extent).toBeGreaterThanOrEqual(orbit + radius);
        const child = new Group(); child.position.set(orbit, 0, 0); parent.add(child); parent.updateMatrixWorld(true);
        expect(child.getWorldPosition(new Vector3()).distanceTo(parent.position)).toBeCloseTo(orbit, 12);
        expect(child.getWorldScale(new Vector3()).toArray()).toEqual([1, 1, 1]);
      }
    }
  });
  it('separates every focused system from neighboring bodies and full rendered orbit curves at the sample epoch', () => {
    for (const mode of ['artistic', 'orrery'] as const) {
      const positions = mode === 'orrery' ? raw : new Map(planets.map(p => [p.id, new Vector3(p.orbitRadius, 0, 0)]));
      const rings = mode === 'orrery' ? paths : new Map(planets.map(p => {
        const points = new Float32Array(128 * 3);
        for (let i = 0; i < 128; i++) { points[i * 3] = p.orbitRadius * Math.cos(i * Math.PI / 64); points[i * 3 + 2] = p.orbitRadius * Math.sin(i * Math.PI / 64); }
        return [p.id, orbitReference(points)];
      }));
      for (const planet of planets) {
        const extent = localSystemExtent(planet, getMoonsByPlanet(planet.id), mode);
        const expansion = requiredExpansion(planet.id, extent, planets, positions, rings);
        expect(expansion).toBeGreaterThanOrEqual(1); expect(expansion).toBeLessThanOrEqual(MAX_FOCUS_EXPANSION);
        for (const other of planets.filter(p => p.id !== planet.id)) {
          if (expansion === MAX_FOCUS_EXPANSION) continue; // Genuine crossings use bounded local line fade.
          const required = extent * 1.25 + planetDisplayExtent(other);
          expect(positions.get(planet.id)!.distanceTo(positions.get(other.id)!) * expansion).toBeGreaterThan(required);
          expect(distanceToOrbit(positions.get(planet.id)!, rings.get(other.id)!.points) * expansion).toBeGreaterThan(required);
        }
      }
    }
  });
  it('keeps Venus and its orbit out of the Earth–Moon system during September–October playback and reverse/date jumps', () => {
    const earth = getPlanetById('earth')!;
    const extent = localSystemExtent(earth, getMoonsByPlanet('earth'), 'orrery');
    const space = createFocusSpace(); space.paths = paths;
    const dates = [...Array.from({ length: 31 }, (_, i) => epoch + i * day), epoch - 8 * day, Date.parse('2030-01-01T00:00Z'), epoch];
    let first = true;
    for (const date of dates) {
      for (const planet of planets) space.raw.set(planet.id, scenePosition(planet.id, date));
      const target = requiredExpansion('earth', extent, planets, space.raw, space.paths);
      advanceFocusSpace(space, 'earth', target, extent, 1 / 60, first); first = false;
      for (let frame = 0; frame < 60; frame++) advanceFocusSpace(space, 'earth', target, extent, 1 / 60, false);
      const earthWorld = applyFocusSpace(space, space.raw.get('earth')!, new Vector3());
      const venusWorld = applyFocusSpace(space, space.raw.get('venus')!, new Vector3());
      expect(earthWorld.distanceTo(venusWorld)).toBeGreaterThan(extent + getPlanetById('venus')!.visualRadius);
      expect(distanceToOrbit(space.raw.get('earth')!, paths.get('venus')!.points) * space.scale).toBeGreaterThan(extent);
      expect(earthWorld.distanceTo(space.raw.get('earth')!)).toBeLessThan(1e-8);
    }
  });
  it('handles interrupted parent transitions and returns exactly to the original full-system layout', () => {
    const space = createFocusSpace(); space.raw = raw;
    advanceFocusSpace(space, 'earth', 4, 1, 0.016, false);
    const before = applyFocusSpace(space, raw.get('mars')!, new Vector3());
    advanceFocusSpace(space, 'mars', 7, 2, 0.016, false);
    const after = applyFocusSpace(space, raw.get('mars')!, new Vector3());
    const shift = focusLayoutShift(space, raw.get('mars')!, new Vector3());
    expect(after.clone().sub(before).distanceTo(shift)).toBeLessThan(1e-10);
    for (let i = 0; i < 300; i++) advanceFocusSpace(space, null, 1, 0, 1 / 60, false);
    expect(space.scale).toBe(1); expect(space.offset.toArray()).toEqual([0, 0, 0]); expect(space.clearance).toBe(0);
    expect(applyFocusSpace(space, raw.get('venus')!, new Vector3()).equals(raw.get('venus')!)).toBe(true);
  });
  it('puts expanded bodies in front of the true infinite celestial depth', () => {
    const camera = new PerspectiveCamera(50, 1, 0.001, 3000);
    for (const distance of [100, 400, 1500, 2900]) {
      const depth = new Vector3(0, 0, -distance).project(camera).z;
      expect(depth).toBeLessThan(1);
      if (distance >= 400) expect(depth).toBeGreaterThan(0.99999); // The old sky depth would paint over these bodies.
    }
  });
  it('bounds coincident orbit/body degeneracies and snaps for reduced motion and mission overrides', () => {
    const space = createFocusSpace(); space.raw.set('earth', new Vector3(5, 0, 0)); space.raw.set('venus', new Vector3(5, 0, 0));
    expect(requiredExpansion('earth', 1, planets, space.raw, space.paths)).toBe(MAX_FOCUS_EXPANSION);
    advanceFocusSpace(space, 'earth', MAX_FOCUS_EXPANSION, 1, 0.016, true);
    expect(space.scale).toBe(MAX_FOCUS_EXPANSION);
    for (const mode of ['artistic', 'orrery', 'sky'] as const) {
      expect(focusedParent({ level: 'planet', planetId: 'earth' }, mode, true)).toBeNull();
    }
    expect(focusedParent({ level: 'moon', planetId: 'mars', moonId: 'phobos' }, 'sky', false)).toBeNull();
    advanceFocusSpace(space, null, 1, 0, 0.016, true);
    expect(space.scale).toBe(1); expect(space.offset.length()).toBe(0);
  });
});
