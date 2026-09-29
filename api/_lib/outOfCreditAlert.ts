import { neon } from '@neondatabase/serverless';
import type { Subscription } from './stellaAvailability.js';

/** At most one Slack alert per window, however many sessions fail. */
export const ALERT_WINDOW_HOURS = 12;
const ALERT_KEY = 'elevenlabs_out_of_credit';

export function outOfCreditMessage(sub: Subscription & { next_character_count_reset_unix?: number | null }): string {
  const fmt = (n: number) => Math.max(0, Math.round(n)).toLocaleString('en-US');
  const reset = sub.next_character_count_reset_unix
    ? ` Credit resets ${new Date(sub.next_character_count_reset_unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}.`
    : '';
  return `:red_circle: *Stella is out of ElevenLabs credit.* ${fmt(sub.character_limit - sub.character_count)} of ${fmt(sub.character_limit)} credits left.${reset} Stella is paused on spaceexplorer.tech (visitors see "Stella is resting right now"), and other voice agents on this account will fail too. Top up: https://elevenlabs.io/app/subscription`;
}

let memoryClaimAt = 0;

/**
 * Claim the right to alert for this window. The claim is an atomic row update,
 * so a burst of failed sessions across instances still yields one alert. Without
 * a database, fall back to this instance's memory.
 */
async function claimAlert(): Promise<boolean> {
  const url = process.env.DASHBOARD_DATABASE_URL?.trim();
  if (!url) {
    if (Date.now() - memoryClaimAt < ALERT_WINDOW_HOURS * 3600_000) return false;
    memoryClaimAt = Date.now();
    return true;
  }
  const db = neon(url);
  await db`CREATE TABLE IF NOT EXISTS stella_alerts (key TEXT PRIMARY KEY, alerted_at TIMESTAMPTZ NOT NULL)`;
  const claimed = await db`
    INSERT INTO stella_alerts (key, alerted_at) VALUES (${ALERT_KEY}, now())
    ON CONFLICT (key) DO UPDATE SET alerted_at = now()
      WHERE stella_alerts.alerted_at < now() - make_interval(hours => ${ALERT_WINDOW_HOURS})
    RETURNING key`;
  return claimed.length > 0;
}

async function releaseAlert() {
  const url = process.env.DASHBOARD_DATABASE_URL?.trim();
  if (!url) { memoryClaimAt = 0; return; }
  await neon(url)`UPDATE stella_alerts SET alerted_at = 'epoch' WHERE key = ${ALERT_KEY}`;
}

/** Post the out-of-credit alert to Slack unless one already went out this window. */
export async function alertOutOfCredit(sub: Subscription): Promise<'sent' | 'deduped' | 'no_webhook' | 'failed'> {
  const webhook = process.env.SLACK_ALERTS_WEBHOOK_URL?.trim();
  if (!webhook) return 'no_webhook';
  try {
    if (!(await claimAlert())) return 'deduped';
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: outOfCreditMessage(sub) }),
    });
    if (res.ok) return 'sent';
    console.error(`stella-alert: Slack ${res.status}`);
    await releaseAlert(); // let the next failure retry
    return 'failed';
  } catch (error) {
    console.error('stella-alert: failed', error);
    return 'failed';
  }
}
