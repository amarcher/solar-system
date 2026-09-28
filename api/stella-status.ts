import { decideStellaStatus, type Subscription } from './_lib/stellaAvailability.js';

// Server-only ElevenLabs key (read access to User is enough). Trim: env values
// added via stdin can carry a trailing newline.
const API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
const DISABLED = /^(1|true|yes)$/i.test(process.env.STELLA_DISABLED?.trim() ?? '');
const MIN_CREDITS = Number(process.env.STELLA_MIN_CREDITS?.trim()) || undefined;

async function fetchSubscription(): Promise<Subscription | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': API_KEY },
    });
    if (!res.ok) {
      console.error(`stella-status: ElevenLabs ${res.status}`);
      return null;
    }
    return (await res.json()) as Subscription;
  } catch (error) {
    console.error('stella-status: ElevenLabs request failed', error);
    return null;
  }
}

export async function GET(): Promise<Response> {
  const status = decideStellaStatus(DISABLED ? null : await fetchSubscription(), {
    disabled: DISABLED,
    minCredits: MIN_CREDITS,
  });
  return Response.json(status, {
    // Visitors share one cached answer; ElevenLabs is asked at most every few minutes.
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
