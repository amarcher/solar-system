import { scaleAU } from '../astronomy/realisticScale';

export type BeltId = 'asteroid' | 'kuiper';
export const DEBRIS_BELTS = {
  asteroid: { name: 'Asteroid belt', innerAU: 2.1, outerAU: 3.3, innerArt: 14.5, outerArt: 18.5, maxInclination: 0.18, count: 1800, color: '#e9c581' },
  kuiper: { name: 'Kuiper Belt', innerAU: 32, outerAU: 50, innerArt: 38.5, outerArt: 47, maxInclination: 0.28, count: 2800, color: '#90cbe0' },
} as const;

/** Representative populations, not catalogued object positions. Circular inclined
 * orbits keep the teaching layer cheap; real belts include eccentric populations. */
export function createBeltSamples(id: BeltId) {
  const belt = DEBRIS_BELTS[id];
  let seed = id === 'asteroid' ? 541 : 1982;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: belt.count }, () => {
    const au = belt.innerAU + random() * (belt.outerAU - belt.innerAU);
    return { au, phase: random() * Math.PI * 2, inclination: random() ** 2 * belt.maxInclination, node: random() * Math.PI * 2, size: 0.7 + random() * 0.7 };
  });
}

export function beltRadius(id: BeltId, au: number, realistic: boolean) {
  if (realistic) return scaleAU(au);
  const b = DEBRIS_BELTS[id];
  return b.innerArt + (au - b.innerAU) / (b.outerAU - b.innerAU) * (b.outerArt - b.innerArt);
}

/** Kepler's third law, for circular test particles orbiting the Sun. */
export const beltRadiansPerDay = (au: number) => 2 * Math.PI / (365.25 * au ** 1.5);
