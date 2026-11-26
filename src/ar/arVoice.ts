import { planets } from '../data/planets';
import { sun } from '../data/sun';
import { categoryLabels } from '../utils/colors';

/**
 * What Stella, the voice guide, is told about the headset view, and how the
 * names she says are matched to bodies. Kept free of audio and React so it can
 * be tested.
 */

/** Tools the guide has in the flat-screen app that the headset view cannot carry out. */
export const UNSUPPORTED_TOOLS = [
  'navigate_to_moon', 'peel_sun_layer', 'switch_view_mode', 'set_time', 'set_time_speed', 'show_earth_companion',
  'track_mission', 'set_earth_tides', 'set_constellation_lines', 'set_display_quality', 'show_rubin_finds', 'focus_rubin_find',
] as const;

export const UNSUPPORTED_REPLY = 'That is not available in the headset view. Here you can fly to the Sun or a planet, or go back to the room view.';

export const FIRST_MESSAGE = 'Hi! I’m Stella. The solar system is floating right here in your room. Where shall we fly first?';

/** The body a spoken name refers to: 'sun', a planet id, or null. */
export function findBodyId(spoken: unknown): string | null {
  const name = String(spoken ?? '').trim().toLowerCase().replace(/^the\s+/, '');
  if (!name) return null;
  if (name === 'sun' || name === sun.name.toLowerCase()) return 'sun';
  return planets.find((planet) => planet.name.toLowerCase() === name || planet.id === name)?.id ?? null;
}

export const bodyName = (id: string) => (id === 'sun' ? sun.name : planets.find((planet) => planet.id === id)?.name ?? id);

const SETTING = [
  '[HEADSET VIEW] The child is wearing a mixed-reality headset. A small model of the solar system floats in their own room: the Sun, the planets, Pluto and Ceres, all orbiting.',
  'They can point and tap a body to fly to it, or ask you. Use navigate_to_planet or navigate_to_sun to fly them there, and go_back to return to the room view.',
  'During a visit the room dims into a starry sky, the body is about as wide as a beach ball in front of them, and the other planets keep orbiting past.',
  'There are no moons, detail panels, fact cards, time controls or other view modes here. Nothing is written on screen except name labels, so say facts aloud instead of pointing to text.',
].join('\n');

/** What the child is looking at right now, for the guide. */
export function arSceneContext(focusId: string | null): string {
  if (!focusId) return `${SETTING}\n\n[NOW] They are in the room view, looking at the whole solar system on a tabletop scale.`;
  if (focusId === 'sun') {
    return [
      SETTING, '',
      `[NOW] They just flew to the Sun and it fills the view in front of them.`,
      `Surface temperature: ${sun.surfaceTemperature}°C. Diameter: ${sun.diameter.toLocaleString()} km. Age: ${sun.age}.`,
      sun.summary, '', '[FACTS — not displayed]',
      ...sun.funFacts.map((fact, i) => `${i + 1}. ${fact}`),
    ].join('\n');
  }
  const planet = planets.find((p) => p.id === focusId);
  if (!planet) return SETTING;
  return [
    SETTING, '',
    `[NOW] They just flew to ${planet.name} and it floats in front of them.`,
    `It is a ${categoryLabels[planet.category]}, #${planet.orderFromSun} from the Sun.`,
    `Diameter: ${planet.diameter.toLocaleString()} km. Gravity: ${planet.gravity} m/s². Mean temperature: ${planet.meanTemperature}°C.`,
    `Day length: ${Math.abs(planet.rotationPeriod)} hours. Year length: ${planet.orbitalPeriod} Earth days.`,
    planet.summary, '', '[FACTS — not displayed]',
    ...planet.funFacts.map((fact, i) => `${i + 1}. ${fact}`),
  ].join('\n');
}
