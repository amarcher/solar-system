import data from './ephemeris.json';
import { REPLAY_DAYS } from './types';

export type Vec3 = [number, number, number];
function interpolate(samples: number[][], day: number): Vec3 {
  const t = Number.isFinite(day) ? Math.max(0, Math.min(REPLAY_DAYS, day)) : 0;
  const i = Math.min(REPLAY_DAYS - 1, Math.floor(t));
  return samples[i].map((x, axis) => x + (samples[i + 1][axis] - x) * (t - i)) as Vec3;
}
export function heliocentric(day: number) {
  return { earth: interpolate(data.earth, day), asteroid: interpolate(data.asteroid, day) };
}
export function earthFrame(earth: Vec3, asteroid: Vec3): Vec3 {
  const theta = Math.atan2(earth[1], earth[0]);
  const [x, y, z] = asteroid.map((v, i) => v - earth[i]);
  return [Math.cos(theta) * x + Math.sin(theta) * y, -Math.sin(theta) * x + Math.cos(theta) * y, z];
}
export function sceneVector([x, y, z]: Vec3): Vec3 { return [x, z, -y]; }
export const earthPath = data.earth.map(v => sceneVector(v as Vec3));
export const solarPath = data.asteroid.map(v => sceneVector(v as Vec3));
export const relativePath = data.asteroid.map((v, i) => sceneVector(earthFrame(data.earth[i] as Vec3, v as Vec3)));
