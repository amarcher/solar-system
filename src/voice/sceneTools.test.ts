import { describe, expect, it, vi } from 'vitest';
import { buildSceneContext, createSceneTools, parseTimeRate, type SceneVoiceState } from './sceneTools';
function setup() {
  const state: SceneVoiceState = { nav: { level: 'system' }, mode: 'artistic', tides: false, constellations: false, quality: 'auto', missionActive: false, detailsVisible: true };
  const handlers = { onSetTides: vi.fn(), onSetConstellations: vi.fn(), onSetQuality: vi.fn() };
  return { state, handlers, tools: createSceneTools(() => state, () => handlers) };
}
describe('Stella scene tools', () => {
  it('uses current state, rejects unsupported tides, and never toggles on malformed booleans', () => {
    const { state, handlers, tools } = setup();
    tools.set_earth_tides({ enabled: 'false' });
    expect(handlers.onSetTides).not.toHaveBeenCalled();
    state.mode = 'sky';
    expect(tools.set_earth_tides({ enabled: true })).toContain('unavailable');
    state.mode = 'orrery'; state.missionActive = true;
    expect(tools.set_earth_tides({ enabled: true })).toContain('Close the mission');
    expect(handlers.onSetTides).not.toHaveBeenCalled();
    state.missionActive = false;
    expect(tools.set_earth_tides({ enabled: true })).toContain('combined');
    expect(handlers.onSetTides).toHaveBeenCalledExactlyOnceWith(true);
    state.tides = true;
    tools.set_earth_tides({ enabled: true });
    expect(handlers.onSetTides).toHaveBeenCalledTimes(1);
    tools.set_earth_tides({ enabled: false });
    expect(handlers.onSetTides).toHaveBeenLastCalledWith(false);
  });
  it('restricts constellation lines to supported modes and quality to existing choices', () => {
    const { state, handlers, tools } = setup();
    expect(tools.set_constellation_lines({ enabled: true })).toContain('Orrery and Sky');
    expect(handlers.onSetConstellations).not.toHaveBeenCalled();
    state.mode = 'sky'; tools.set_constellation_lines({ enabled: true });
    expect(handlers.onSetConstellations).toHaveBeenCalledExactlyOnceWith(true);
    tools.set_display_quality({ preference: 'ultra' });
    expect(handlers.onSetQuality).not.toHaveBeenCalled();
    tools.set_display_quality({ preference: 'smooth' });
    expect(handlers.onSetQuality).toHaveBeenCalledExactlyOnceWith('smooth');
  });
  it('describes missing terrain and map limitations without inventing visible detail', () => {
    const { state } = setup();
    state.nav = { level: 'moon', planetId: 'uranus', moonId: 'miranda' };
    expect(buildSceneContext(state)).toContain('Plain gray areas have no imagery');
    expect(buildSceneContext(state)).toContain('Body sizes and local moon offsets stay unchanged');
    state.nav = { level: 'moon', planetId: 'mars', moonId: 'phobos' };
    expect(buildSceneContext(state)).toContain('attribution remains under review');
    state.nav = { level: 'moon', planetId: 'saturn', moonId: 'unknown' };
    expect(buildSceneContext(state)).toContain('no mapped texture');
  });
  it('reports actual mode, toggle state, and non-forecast limitations', () => {
    const { state } = setup(); state.mode = 'sky'; state.constellations = true;
    let context = buildSceneContext(state);
    expect(context).toContain('guide lines are on'); expect(context).toContain('not a naked-eye');
    expect(context).not.toContain('Focused view spreads');
    state.mode = 'orrery'; state.tides = true; context = buildSceneContext(state);
    expect(context).toContain('Both the Moon and Sun always contribute');
    expect(context).toContain('only tides control'); expect(context).toContain('not a local tide forecast');
    expect(context).toContain('does not simulate tidal friction');
    state.tides = false; expect(buildSceneContext(state)).toContain('overlay is off');
  });
  it('accepts complete finite rates and rejects corrupting inputs', () => {
    for (const value of ['Infinity', Infinity, '86400oops', NaN, '', '1e100', '-2592001', {}, undefined]) expect(parseTimeRate(value)).toBeNull();
    expect(parseTimeRate('1 minute')).toBe(60);
    expect(parseTimeRate('paused')).toBe(0);
    expect(parseTimeRate('-86400')).toBe(-86400);
    expect(parseTimeRate('1 month')).toBe(2592000);
  });
});
