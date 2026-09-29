import type { Subscription } from './stellaAvailability.js';

// Server-only ElevenLabs key (read access to User is enough). Trim: env values
// added via stdin can carry a trailing newline.
const API_KEY = process.env.ELEVENLABS_API_KEY?.trim();

/** The account's credit usage, or null when it can't be read. Costs no credits. */
export async function fetchSubscription(): Promise<Subscription | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': API_KEY },
    });
    if (!res.ok) {
      console.error(`elevenlabs: subscription ${res.status}`);
      return null;
    }
    return (await res.json()) as Subscription;
  } catch (error) {
    console.error('elevenlabs: subscription request failed', error);
    return null;
  }
}
