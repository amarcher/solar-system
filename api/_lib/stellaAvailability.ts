/**
 * Whether to offer Stella (the ElevenLabs voice guide) to visitors.
 * Only a yes/no and a coarse reason leave the server; credit numbers don't.
 */

export type StellaReason = 'ok' | 'overage' | 'unchecked' | 'disabled' | 'out_of_credit';

export interface StellaStatus {
  available: boolean;
  reason: StellaReason;
}

/** Fields we read from GET /v1/user/subscription. */
export interface Subscription {
  character_count: number;
  character_limit: number;
  can_extend_character_limit?: boolean;
  allowed_to_extend_character_limit?: boolean;
}

/** Default credit floor: stop offering Stella before a conversation would be cut off mid-way. */
export const DEFAULT_MIN_CREDITS = 2000;

export function decideStellaStatus(
  subscription: Subscription | null,
  options: { disabled?: boolean; minCredits?: number } = {},
): StellaStatus {
  if (options.disabled) return { available: false, reason: 'disabled' };
  // Couldn't check: fail open. The client still handles a refused session.
  if (!subscription) return { available: true, reason: 'unchecked' };
  const remaining = subscription.character_limit - subscription.character_count;
  if (remaining >= (options.minCredits ?? DEFAULT_MIN_CREDITS)) return { available: true, reason: 'ok' };
  if (subscription.can_extend_character_limit && subscription.allowed_to_extend_character_limit) {
    return { available: true, reason: 'overage' };
  }
  return { available: false, reason: 'out_of_credit' };
}
