import { decideStellaStatus } from './_lib/stellaAvailability.js';
import { fetchSubscription } from './_lib/elevenlabs.js';
import { alertOutOfCredit } from './_lib/outOfCreditAlert.js';

const DISABLED = /^(1|true|yes)$/i.test(process.env.STELLA_DISABLED?.trim() ?? '');
const MIN_CREDITS = Number(process.env.STELLA_MIN_CREDITS?.trim()) || undefined;

export async function GET(): Promise<Response> {
  const sub = DISABLED ? null : await fetchSubscription();
  const status = decideStellaStatus(sub, { disabled: DISABLED, minCredits: MIN_CREDITS });
  // This check already has the numbers: if credit is gone, alert (deduped) now.
  if (sub && status.reason === 'out_of_credit') await alertOutOfCredit(sub);
  return Response.json(status, {
    // Visitors share one cached answer; ElevenLabs is asked at most every few minutes.
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
