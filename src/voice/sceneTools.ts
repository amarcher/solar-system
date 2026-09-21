import type { NavigationState } from '../types/celestialBody';
import type { ViewMode } from '../astronomy/types';
import type { QualityPreference } from '../performance/qualityPolicy';
import { textureManifest } from '../data/textureManifest';
import { tidesVoiceContext, TIDES_OVERLAY_STATE } from '../lessons/tides/model';

export interface SceneVoiceState {
  nav: NavigationState;
  mode: ViewMode;
  tides: boolean;
  constellations: boolean;
  quality: QualityPreference;
  missionActive: boolean;
  detailsVisible: boolean;
}
export interface SceneToolHandlers {
  onSetTides: (enabled: boolean) => void;
  onSetConstellations: (enabled: boolean) => void;
  onSetQuality: (preference: QualityPreference) => void;
}

/** Read current state at invocation, never the state when the session started. */
export function createSceneTools(read: () => SceneVoiceState, handlers: () => SceneToolHandlers) {
  return {
    set_earth_tides: ({ enabled }: { enabled?: unknown }) => {
      if (typeof enabled !== 'boolean') return 'Please provide enabled as true or false.';
      const state = read();
      if (enabled && state.mode === 'sky') return 'Earth tides are unavailable in Sky. Ask to switch to Explore or Orrery first.';
      if (enabled && state.missionActive) return 'Close the mission replay before turning on Earth tides.';
      if (state.tides === enabled) return `Earth tides are already ${enabled ? 'on' : 'off'}.`;
      handlers().onSetTides(enabled);
      return enabled ? 'Showing Earth with the combined Moon-and-Sun water envelope. Water shape is exaggerated; this is not a coastal tide forecast.' : 'Earth tides turned off.';
    },
    set_constellation_lines: ({ enabled }: { enabled?: unknown }) => {
      if (typeof enabled !== 'boolean') return 'Please provide enabled as true or false.';
      const state = read();
      if (state.mode === 'artistic') return 'Constellation lines are available in Orrery and Sky. Ask to switch modes first.';
      if (state.constellations !== enabled) handlers().onSetConstellations(enabled);
      return `Western constellation guide lines ${enabled ? 'on' : 'off'}. These are imagined patterns, not physical connections.`;
    },
    set_display_quality: ({ preference }: { preference?: unknown }) => {
      if (preference !== 'auto' && preference !== 'smooth' && preference !== 'detailed') return 'Choose auto, smooth, or detailed.';
      if (read().quality !== preference) handlers().onSetQuality(preference);
      return `Display preference set to ${preference}. ${preference === 'detailed' ? 'Sharper available textures may use more power; missing terrain is not reconstructed.' : preference === 'smooth' ? 'Less detail can help motion; frame rate is not guaranteed.' : 'The app adjusts detail for the device.'}`;
    },
  };
}

export function buildSceneContext(state: SceneVoiceState): string {
  const lines = ['[CURRENT SCENE FEATURES]', `View: ${state.mode === 'artistic' ? 'Explore' : state.mode === 'orrery' ? 'Orrery' : 'Sky'}. Display preference: ${state.quality}.`];
  lines.push(state.detailsVisible ? 'Desktop detail panels are available.' : 'Compact or cinema view: detail panels and Sun peeling controls are hidden. Do not claim property cards or peelable layers are visible.');
  if (state.mode === 'artistic') lines.push('Explore uses illustrative motion and a star-rich artistic Milky Way panorama. It is not a dated sky chart. Constellation lines are unavailable here.');
  else lines.push(`The display-enhanced NASA/Gaia Milky Way background and catalog stars share the celestial frame. Brightness is enhanced, not a naked-eye visibility forecast. Western constellation guide lines are ${state.constellations ? 'on' : 'off'}; they are imagined patterns, not physical connections. No selectable nebula, galaxy tour, or aurora control is implemented.`);
  if (state.mode !== 'sky' && !state.missionActive && (state.nav.level === 'planet' || state.nav.level === 'moon')) lines.push('Focused view spreads heliocentric positions and orbit paths apart to keep the local moon system readable. Body sizes and local moon offsets stay unchanged. Distances and sizes are illustrative, not one physical scale; do not infer collisions or forces from screen spacing.');
  if (state.nav.level === 'moon' && state.mode !== 'sky') {
    const asset = textureManifest.find(asset => asset.bodyId === (state.nav.level === 'moon' ? state.nav.moonId : '') && asset.kind === 'diffuse');
    lines.push(asset ? `Surface map: ${asset.coverage ?? 'A bundled surface map is available; do not assume complete observed coverage or exact current lighting.'} ${asset.provenance.status === 'verified' ? `Credit: ${asset.provenance.credit}.` : 'Individual source attribution remains under review.'} Texture loading or quality can limit visible detail.` : 'This moon has no mapped texture in the asset inventory; the rendered surface is an illustration. Do not describe visible photographic detail.');
  }
  lines.push(state.tides ? tidesVoiceContext(TIDES_OVERLAY_STATE) : 'Earth tides overlay is off. set_earth_tides can focus Earth and switch on the combined Sun-and-Moon water layer in Explore or Orrery outside mission replay. Only on/off is available; no arrows, source selector, phase presets, pause, or recording control.');
  lines.push('The tides illustration does not simulate tidal friction, Earth slowing down, or the Moon receding. Explain those separately if asked; never claim they are visible here.');
  if (state.missionActive) lines.push('A mission replay is active. It is an illustrative trajectory, not live spacecraft telemetry.');
  return lines.join('\n');
}

export function parseTimeRate(value: unknown): number | null {
  const speeds: Record<string, number> = {
    paused: 0, pause: 0, stop: 0, 'real-time': 1, '1x': 1, normal: 1, realtime: 1,
    '1 minute': 60, '10 minutes': 600, '10 min': 600,
    '1 hour': 3600, '1 hr': 3600, '1 day': 86400, '1 month': 2592000,
  };
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return null;
  const rate = Object.hasOwn(speeds, text) ? speeds[text] : Number(text);
  return Number.isFinite(rate) && Math.abs(rate) <= 2592000 ? rate : null;
}
