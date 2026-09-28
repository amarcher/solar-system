import { describe, expect, it } from 'vitest';
import { outOfCreditMessage } from '../../api/_lib/outOfCreditAlert';

describe('outOfCreditMessage', () => {
  it('says Stella is paused, with credits left, reset date and a top-up link', () => {
    const text = outOfCreditMessage({
      character_count: 99_500,
      character_limit: 100_000,
      next_character_count_reset_unix: Date.UTC(2026, 9, 12) / 1000,
    });
    expect(text).toMatch(/out of ElevenLabs credit.*500 of 100,000 credits left.*resets Oct 12.*Stella is paused.*elevenlabs\.io\/app\/subscription/);
  });
});
