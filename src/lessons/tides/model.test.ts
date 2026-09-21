import { describe, expect, it } from 'vitest';
import { bodyDirection, differentialField, gravityField, INITIAL_TIDES, oceanPotential, oceanRadius, SOLAR_TIDE_RATIO, tidesCaption, tidesVoiceContext, type TidesState, type Vec3 } from './model';
const magnitude = (v: Vec3) => Math.hypot(...v);
const state = (phase: number, source: TidesState['source'] = 'both'): TidesState => ({ step: 'water', source, phase });
function equatorialRange(s: TidesState): number {
  const heights = Array.from({ length: 360 }, (_, angle) => oceanPotential(bodyDirection('moon', angle), s));
  return Math.max(...heights) - Math.min(...heights);
}
describe('tidal physics independent of the scene scale', () => {
  it('uses the weaker solar tide at representative physical distances', () => {
    expect(SOLAR_TIDE_RATIO).toBeGreaterThan(0.45);
    expect(SOLAR_TIDE_RATIO).toBeLessThan(0.47);
    expect(magnitude(differentialField([1, 0, 0], state(0, 'sun')))).toBeLessThan(magnitude(differentialField([1, 0, 0], state(0, 'moon'))));
  });
  it('keeps actual gravity attractive on both near and far sides', () => {
    const near = gravityField([1, 0, 0], 'moon', 0);
    const far = gravityField([-1, 0, 0], 'moon', 0);
    expect(near[0]).toBeGreaterThan(0);
    expect(far[0]).toBeGreaterThan(0);
    expect(magnitude(near)).toBeGreaterThan(magnitude(far));
    expect(differentialField([1, 0, 0], state(0, 'moon'))[0]).toBeGreaterThan(0);
    expect(differentialField([-1, 0, 0], state(0, 'moon'))[0]).toBeLessThan(0);
    expect(differentialField([0, 0, 0], state(0))).toEqual([0, 0, 0]);
  });
  it('reinforces in both aligned and opposite configurations', () => {
    const lunar = equatorialRange(state(0, 'moon'));
    const newMoon = equatorialRange(state(0));
    const fullMoon = equatorialRange(state(180));
    expect(newMoon).toBeCloseTo(fullMoon, 12);
    expect(newMoon).toBeGreaterThan(lunar);
    const quarter = equatorialRange(state(90));
    expect(quarter).toBeLessThan(lunar);
    expect(quarter).toBeGreaterThan(0.5);
  });
  it('has symmetric finite bulges and an inward differential field at quadrature', () => {
    for (let phase = 0; phase <= 360; phase += 15) {
      for (let angle = 0; angle < 360; angle += 15) {
        const r = bodyDirection('moon', angle);
        const opposite: Vec3 = [-r[0], -r[1], -r[2]];
        expect(oceanRadius(r, state(phase))).toBeCloseTo(oceanRadius(opposite, state(phase)), 12);
        expect(oceanRadius(r, state(phase))).toBeGreaterThan(1);
        expect(oceanRadius(r, state(phase))).toBeLessThan(1.6);
      }
    }
    expect(differentialField([0, 1, 0], state(0, 'moon'))[1]).toBeLessThan(0);
    expect(oceanRadius([1, 0, 0], state(0, 'moon'))).toBeGreaterThan(oceanRadius([0, 1, 0], state(0, 'moon')));
  });
  it('shares scientifically qualified captions with voice and capture consumers', () => {
    expect(tidesCaption({ ...INITIAL_TIDES, step: 'difference' }).explanation).toContain('Nothing is pushing');
    expect(tidesVoiceContext(state(90))).toContain('Schematic, not the current date');
    expect(tidesVoiceContext(state(90))).toContain('not a prediction');
    expect(tidesCaption(state(90)).explanation).toContain('do not disappear');
  });
});
