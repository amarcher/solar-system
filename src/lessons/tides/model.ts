export type TideStep = 'gravity' | 'difference' | 'water';
export type TideSource = 'moon' | 'sun' | 'both';
export interface TidesState { step: TideStep; source: TideSource; phase: number }
export type Vec3 = readonly [number, number, number];
export const INITIAL_TIDES: TidesState = { step: 'gravity', source: 'moon', phase: 0 };
export const TIDES_QUALIFICATION = 'Water shape exaggerated. This simplified model leaves out coastlines and ocean depth.';
// Representative geocentric distances (km) and standard gravitational parameters
// (km³/s²). These are physical constants, independent of the display geometry.
export const TIDE_BODIES = {
  moon: { gm: 4902.800118, distance: 384400 },
  sun: { gm: 132712440041.279419, distance: 149597870.7 },
} as const;
export const EARTH_RADIUS_KM = 6371;
const lunarStrength = TIDE_BODIES.moon.gm / TIDE_BODIES.moon.distance ** 3;
export const SOLAR_TIDE_RATIO = (TIDE_BODIES.sun.gm / TIDE_BODIES.sun.distance ** 3) / lunarStrength;
export function bodyDirection(body: 'moon' | 'sun', phase: number): Vec3 {
  const angle = body === 'moon' ? phase * Math.PI / 180 : 0;
  return [Math.cos(angle), Math.sin(angle), 0];
}
export function selectedBodies(source: TideSource): ('moon' | 'sun')[] {
  return source === 'both' ? ['moon', 'sun'] : [source];
}
export function dot(a: Vec3, b: Vec3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
/** Leading-order differential acceleration, in units of GM_moon R_earth / d_moon³. */
export function differentialField(r: Vec3, state: TidesState): Vec3 {
  const result = [0, 0, 0];
  for (const body of selectedBodies(state.source)) {
    const n = bodyDirection(body, state.phase);
    const weight = body === 'moon' ? 1 : SOLAR_TIDE_RATIO;
    const projection = dot(r, n);
    for (let axis = 0; axis < 3; axis++) result[axis] += weight * (3 * projection * n[axis] - r[axis]);
  }
  return [result[0], result[1], result[2]];
}
/** True attraction toward one body, normalized by that body's center acceleration.
 * Arrows for different bodies therefore illustrate direction, not relative strength. */
export function gravityField(r: Vec3, body: 'moon' | 'sun', phase: number): Vec3 {
  const { distance } = TIDE_BODIES[body];
  const n = bodyDirection(body, phase);
  const offset = n.map((v, i) => v - r[i] * EARTH_RADIUS_KM / distance);
  const length = Math.hypot(...offset);
  return [offset[0] / length ** 3, offset[1] / length ** 3, offset[2] / length ** 3];
}
/** Degree-two equilibrium potential. r must be a unit surface direction. */
export function oceanPotential(r: Vec3, state: TidesState): number {
  return selectedBodies(state.source).reduce((sum, body) => {
    const cosine = dot(r, bodyDirection(body, state.phase));
    return sum + (body === 'moon' ? 1 : SOLAR_TIDE_RATIO) * (3 * cosine ** 2 - 1) / 2;
  }, 0);
}
export function oceanRadius(r: Vec3, state: TidesState): number {
  return 1.18 + 0.22 * oceanPotential(r, state);
}
export function phaseLabel(phase: number): string {
  if (phase === 0 || phase === 360) return 'New Moon';
  if (phase === 180) return 'Full Moon';
  if (phase === 90 || phase === 270) return 'Quarter Moon';
  return `Moon angle ${Math.round(phase)}°`;
}
export function tidesCaption(state: TidesState): { title: string; explanation: string; legend: string } {
  if (state.step === 'gravity') return {
    title: 'Gravity pulls all of Earth',
    explanation: 'Every arrow points toward the body pulling it. The near side feels a little more pull than the far side.',
    legend: 'Attraction: blue = Moon, gold = Sun. Each body’s arrows use its own scale.',
  };
  if (state.step === 'difference') return {
    title: 'Differences in gravity',
    explanation: `Subtract the pull at Earth’s center. The far side falls toward ${state.source === 'sun' ? 'the Sun' : state.source === 'moon' ? 'the Moon' : 'each body'} less quickly than the center does. Nothing is pushing it away.`,
    legend: 'Arrows show the difference from Earth’s center, not total gravity.',
  };
  return {
    title: 'Two sides rise',
    explanation: state.source === 'both'
      ? 'New and full Moon align the tidal effects: spring tides. At quarter Moon, their combined range is smaller: neap tides. Tides do not disappear.'
      : 'In this ideal ocean, different pulls stretch the water into two bulges. Add both bodies to compare spring and neap tides.',
    legend: 'A global equilibrium ocean — not a prediction for any coast.',
  };
}
export function tidesVoiceContext(state: TidesState): string {
  const caption = tidesCaption(state);
  return `[EARTH TIDES LESSON] Schematic, not the current date. Step: ${state.step}. Sources: ${state.source}. ${phaseLabel(state.phase)}. ${caption.title}. ${caption.explanation} ${caption.legend} ${TIDES_QUALIFICATION} Sun tide strength is about 46% of Moon at representative distances. Navigation, time, and mode tools leave this lesson before acting. Do not claim local tide predictions.`;
}
