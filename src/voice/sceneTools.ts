import type { NavigationState } from '../types/celestialBody';
import type { ViewMode } from '../astronomy/types';
import type { QualityPreference } from '../performance/qualityPolicy';
import { textureManifest } from '../data/textureManifest';
import { tidesVoiceContext, TIDES_OVERLAY_STATE } from '../lessons/tides/model';
import { aphelionAu, COMPOSITION_NOTES, getRubinAsteroidById, RUBIN_KIND_LABELS, rubinAsteroids } from '../data/rubinAsteroids';

export interface SceneVoiceState {
  nav: NavigationState;
  mode: ViewMode;
  tides: boolean;
  constellations: boolean;
  quality: QualityPreference;
  missionActive: boolean;
  detailsVisible: boolean;
  /** Rubin Observatory finds layer (Orrery only). */
  rubin: { visible: boolean; selectedId: string | null };
}
export interface SceneToolHandlers {
  onSetRubin: (enabled: boolean) => void;
  onFocusRubin: (id: string, view: 'follow' | 'orbit') => void;
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
    show_rubin_finds: ({ enabled }: { enabled?: unknown }) => {
      if (typeof enabled !== 'boolean') return 'Please provide enabled as true or false.';
      const state = read();
      if (state.mode !== 'orrery') return 'Rubin Observatory finds live in Orrery. Switch to Orrery first with switch_view_mode, then try again.';
      if (state.rubin.visible !== enabled) handlers().onSetRubin(enabled);
      return enabled
        ? `Showing ${rubinAsteroids.length} Rubin Observatory finds as small dots on their real orbits. Invite the child to pick one, or use focus_rubin_find.`
        : 'Rubin Observatory finds hidden.';
    },
    focus_rubin_find: ({ name, view }: { name?: unknown; view?: unknown }) => {
      const state = read();
      if (state.mode !== 'orrery') return 'Rubin Observatory finds live in Orrery. Switch to Orrery first with switch_view_mode, then try again.';
      if (state.missionActive) return 'Close the mission replay before visiting a Rubin find.';
      const match = findRubinAsteroid(String(name ?? ''));
      if (!match) return `No Rubin find matches "${String(name ?? '')}". Options: ${rubinAsteroids.map(a => `${a.name} (${a.headline})`).join('; ')}.`;
      const framing = view === 'orbit' ? 'orbit' : 'follow';
      handlers().onFocusRubin(match.id, framing);
      return `${framing === 'orbit' ? 'Showing the whole orbit of' : 'Flying to'} ${match.name}, "${match.headline}". ${match.rubinDiscovered ? 'Discovered by Rubin.' : 'Seen by Rubin; discovered earlier by others.'} ${match.blurb} Size: ${match.sizeText} The rock shape is an artist's guess.`;
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
  if (state.mode === 'orrery') lines.push(...rubinContext(state.rubin));
  if (state.missionActive) lines.push('A mission replay is active. It is an illustrative trajectory, not live spacecraft telemetry.');
  return lines.join('\n');
}

/** Match a spoken name, designation, nickname or headline ("the speedy spinner", "atlas", "quasi moon"). */
export function findRubinAsteroid(query: string) {
  const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const q = normalize(query);
  if (!q) return undefined;
  const compact = q.replace(/ /g, '');
  const exact = rubinAsteroids.find(a => [a.name, a.designation].some(n => normalize(n).replace(/ /g, '').includes(compact)));
  if (exact) return exact;
  const words = q.split(' ').filter(w => w.length >= 3 && !['the', 'and', 'one', 'that'].includes(w));
  let best: (typeof rubinAsteroids)[number] | undefined;
  let bestScore = 0;
  for (const a of rubinAsteroids) {
    const text = normalize(`${a.name} ${a.headline} ${RUBIN_KIND_LABELS[a.kind]}`);
    const score = words.reduce((sum, w) => sum + (text.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { best = a; bestScore = score; }
  }
  return best;
}

function rubinContext({ visible, selectedId }: SceneVoiceState['rubin']): string[] {
  if (!visible) return ['Rubin Observatory finds layer is off. show_rubin_finds can turn it on (Orrery only) to show hand-picked asteroids, comets, and distant worlds the Vera C. Rubin Observatory discovered or photographed; focus_rubin_find flies to one by name or nickname.'];
  const lines = [`Rubin Observatory finds layer is on: ${rubinAsteroids.length} hand-picked objects shown as small colored dots, each moving on its real orbit (two-body approximation from JPL elements). Picking one draws its orbit and shows a short card. "Discovered by Rubin" means MPC credits Rubin with the discovery; "Seen by Rubin" means Rubin photographed an object found earlier. Rubin found over 11,000 new asteroids in about six weeks of 2025 testing. Its public data currently runs through mid-July 2026, so this is not a live feed.`];
  const selected = selectedId ? getRubinAsteroidById(selectedId) : undefined;
  if (selected) {
    lines.push(`Selected: ${selected.name} (${RUBIN_KIND_LABELS[selected.kind]}), "${selected.headline}". ${selected.rubinDiscovered ? 'Discovered by Rubin.' : 'Seen by Rubin, discovered earlier by others.'} Card text: ${selected.blurb}Size: ${selected.sizeText} Likely make-up: ${selected.compositionNote ?? COMPOSITION_NOTES[selected.composition]} The 3D rock is procedural art: shape invented, colors guessed from its orbit family, drawn far larger than true scale.`);
    if (selected.orbitEstimated) lines.push('This orbit comes from only a short stretch of observations and may change as astronomers learn more.');
    if (aphelionAu(selected) > 50) lines.push('The orrery squeezes distance logarithmically, so this far-out path looks much smaller than it really is.');
  }
  return lines;
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
