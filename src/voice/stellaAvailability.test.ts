import { describe, expect, it } from 'vitest';
import { decideStellaStatus } from '../../api/_lib/stellaAvailability';

const sub = (count: number, limit: number, extend = false) => ({
  character_count: count,
  character_limit: limit,
  can_extend_character_limit: extend,
  allowed_to_extend_character_limit: extend,
});

describe('decideStellaStatus', () => {
  it('offers Stella while credit remains above the floor', () => {
    expect(decideStellaStatus(sub(10_000, 100_000))).toEqual({ available: true, reason: 'ok' });
  });

  it('stops offering Stella near the end of the credit', () => {
    expect(decideStellaStatus(sub(99_500, 100_000))).toEqual({ available: false, reason: 'out_of_credit' });
  });

  it('keeps Stella on when usage-based overage is allowed', () => {
    expect(decideStellaStatus(sub(100_000, 100_000, true))).toEqual({ available: true, reason: 'overage' });
  });

  it('fails open when the check itself fails', () => {
    expect(decideStellaStatus(null)).toEqual({ available: true, reason: 'unchecked' });
  });

  it('honors the kill switch and a custom floor', () => {
    expect(decideStellaStatus(sub(0, 100_000), { disabled: true })).toEqual({ available: false, reason: 'disabled' });
    expect(decideStellaStatus(sub(95_000, 100_000), { minCredits: 10_000 }).available).toBe(false);
  });
});
