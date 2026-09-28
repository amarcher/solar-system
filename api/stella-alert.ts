import { decideStellaStatus } from './_lib/stellaAvailability.js';
import { fetchSubscription } from './_lib/elevenlabs.js';
import { alertOutOfCredit } from './_lib/outOfCreditAlert.js';

const MIN_CREDITS = Number(process.env.STELLA_MIN_CREDITS?.trim()) || undefined;

/**
 * The browser reports a Stella session that failed like an out-of-credit refusal.
 * That's only a hint: confirm against ElevenLabs before alerting, so a network
 * blip (or anyone calling this) can never post a false alarm.
 */
export async function POST(): Promise<Response> {
  const sub = await fetchSubscription();
  const status = decideStellaStatus(sub, { minCredits: MIN_CREDITS });
  if (!sub || status.reason !== 'out_of_credit') {
    return Response.json({ outOfCredit: false }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const alert = await alertOutOfCredit(sub);
  return Response.json({ outOfCredit: true, alert }, { headers: { 'Cache-Control': 'no-store' } });
}
