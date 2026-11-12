import data from './ephemeris.json';
import { keplerPosition, type KeplerElements } from '../../astronomy/keplerOrbit';
import { REPLAY_DAYS, REPLAY_START } from './types';

export type Vec3 = [number, number, number];
function interpolate(samples: number[][], day: number): Vec3 {
  const t = Number.isFinite(day) ? Math.max(0, Math.min(REPLAY_DAYS, day)) : 0;
  const i = Math.min(REPLAY_DAYS - 1, Math.floor(t));
  return samples[i].map((x, axis) => x + (samples[i + 1][axis] - x) * (t - i)) as Vec3;
}
export function heliocentric(day: number) {
  return { earth: interpolate(data.earth, day), asteroid: interpolate(data.asteroid, day) };
}

// The bundled Horizons track ends on 8 Nov 2027. These osculating elements
// are derived from its final state (using a three-point velocity estimate),
// so the teaching replay can continue smoothly instead of freezing there.
// Beyond the source year this is a two-body approximation, matching the
// approximation already used for the app's other small bodies.
const CONTINUATION_ELEMENTS: KeplerElements = {
  e: 0.10229372756482627,
  q: 0.8986279463010576,
  i: 7.808048916066198,
  om: 65.45726838976722,
  w: 304.0920740951415,
  tpJd: 2461684.1672709207,
  meanMotionDegPerDay: 0.9840917311085937,
};

/** Kamoʻoalewa's heliocentric position, exact to the saved track for year one. */
export function companionPosition(day: number): Vec3 {
  const t = Number.isFinite(day) ? Math.max(0, day) : 0;
  if (t <= REPLAY_DAYS) return heliocentric(t).asteroid;
  const position = keplerPosition(CONTINUATION_ELEMENTS, REPLAY_START + t * 86_400_000);
  return [position.x, position.y, position.z];
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
