/**
 * Stella's narrated tour: pre-recorded, so it needs no microphone and spends
 * no conversation credit. Audio lives in public/audio/tour/<id>.mp3 and is
 * regenerated from these lines by `node scripts/tour/generate-audio.mjs`.
 *
 * Sources: Earth's orbital speed (29.8 km/s), Saturn's ring particles and
 * Jupiter's volume (1,300+ Earths) from NASA Science planet pages; 2025 MN45
 * (0.71 km, one turn in 1.88 minutes) from docs/rubin-asteroids-research-2026-09-28.md.
 */
export type TourTarget =
  | { kind: 'system' }
  | { kind: 'planet'; planetId: string }
  | { kind: 'rubin'; findId: string };

export interface TourStep {
  id: string;
  target: TourTarget;
  text: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'hello',
    target: { kind: 'system' },
    text: "Hi, I'm Stella, your space guide! These are the planets in their real spots around the Sun, right now. I squished the distances so they all fit.",
  },
  {
    id: 'earth',
    target: { kind: 'planet', planetId: 'earth' },
    text: "That's Earth, our home. Right now it's zooming around the Sun at about 30 kilometers every second!",
  },
  {
    id: 'jupiter',
    target: { kind: 'planet', planetId: 'jupiter' },
    text: 'Here comes Jupiter, the biggest planet. More than 1,300 Earths could fit inside it.',
  },
  {
    id: 'saturn',
    target: { kind: 'planet', planetId: 'saturn' },
    text: "Saturn's rings look solid, but they're made of billions of pieces of ice. Some are as small as a grain of sand, and some are as big as a house.",
  },
  {
    id: 'rubin',
    target: { kind: 'rubin', findId: '2025-mn45' },
    text: "And this rock was discovered just last year by a brand-new telescope, the Rubin Observatory. It's as big as a mountain, and it spins all the way around in under two minutes!",
  },
  {
    id: 'invite',
    target: { kind: 'rubin', findId: '2025-mn45' },
    text: "Want to know more? You can ask me anything, out loud! Or keep exploring on your own. There's a whole solar system out there!",
  },
];

export function tourAudioSrc(step: TourStep): string {
  return `/audio/tour/${step.id}.mp3`;
}

/** Caption-reading pace for when audio can't play (muted, blocked, or failed to load). */
export function fallbackDurationMs(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(3500, (words / 2.6) * 1000 + 1200);
}
