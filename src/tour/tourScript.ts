/**
 * Stella's narrated tour of the Rubin Observatory finds: pre-recorded, so it
 * needs no microphone and spends no conversation credit. Audio lives in
 * public/audio/tour/<id>.mp3 and is regenerated from `speech` (or `text`) by
 * `node scripts/tour/generate-audio.mjs`.
 *
 * Figures match src/data/rubinAsteroids.ts and the verified-facts table in
 * docs/rubin-asteroids-research-2026-09-28.md (snapshot pairs about 33 minutes
 * apart; 11,000+ new asteroids from about 6 weeks of 2025 testing).
 */
export interface TourTarget {
  /** The find to fly to, or null for the whole solar system with the finds layer on. */
  findId: string | null;
  view?: 'follow' | 'orbit';
}

export interface TourStep {
  id: string;
  target: TourTarget;
  /** The caption. */
  text: string;
  /** What Stella says, when designations need spelling out for text-to-speech. */
  speech?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'hello',
    target: { findId: null },
    text: "Hi, I'm Stella! Let's go asteroid hunting. A giant new telescope, the Rubin Observatory, photographs each patch of sky twice, about half an hour apart. Stars stay put. Anything that moved is something new!",
  },
  {
    id: 'count',
    target: { findId: null },
    text: 'In just six weeks of testing, Rubin found more than 11,000 new asteroids. Every dot here is one of its finds. Let\'s visit a few!',
  },
  {
    id: 'spinner',
    target: { findId: '2025-mn45' },
    text: "This is 2025 MN45, the speedy spinner. It's as big as a mountain, and it spins all the way around in under two minutes! It has to be solid rock. A pile of rubble would fly apart.",
    speech: "This is twenty twenty-five M N forty-five, the speedy spinner. It's as big as a mountain, and it spins all the way around in under two minutes! It has to be solid rock. A pile of rubble would fly apart.",
  },
  {
    id: 'quasi-moon',
    target: { findId: '2025-pn7' },
    text: "See Earth right beside it? 2025 PN7 goes around the Sun in step with us, so it seems to stay nearby. It's called a quasi-moon. It isn't a real moon, because it orbits the Sun, not Earth.",
    speech: "See Earth right beside it? Twenty twenty-five P N seven goes around the Sun in step with us, so it seems to stay nearby. It's called a quasi-moon. It isn't a real moon, because it orbits the Sun, not Earth.",
  },
  {
    id: 'far-traveler',
    target: { findId: '2025-ls2', view: 'orbit' },
    text: '2025 LS2 is a long-distance traveler. Its stretched-out orbit swings about 1,000 times farther from the Sun than Earth. One trip around takes about 12,000 years!',
    speech: 'Twenty twenty-five L S two is a long-distance traveler. Its stretched-out orbit swings about one thousand times farther from the Sun than Earth. One trip around takes about twelve thousand years!',
  },
  {
    id: 'interstellar',
    target: { findId: 'c-2025-n1' },
    text: "And this is 3I/ATLAS, a visitor from another star! It's only the third one ever found. Rubin photographed it by accident, 10 days before anyone knew it was there. It's just passing through, and it will never come back.",
    speech: "And this is three-I Atlas, a visitor from another star! It's only the third one ever found. Rubin photographed it by accident, ten days before anyone knew it was there. It's just passing through, and it will never come back.",
  },
  {
    id: 'invite',
    target: { findId: null },
    text: 'Those are just a few of Rubin\'s finds. Tap any of them to explore, or ask me anything, out loud!',
  },
];

export function tourAudioSrc(step: TourStep): string {
  return `/audio/tour/${step.id}.mp3`;
}

/** Caption-reading pace for when audio can't play (missing file or no network). */
export function fallbackDurationMs(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(3500, (words / 3) * 1000 + 1000);
}
