import { describe, expect, it } from 'vitest';
import { initialQuality, readQualityPreference, updateQuality } from './qualityPolicy';

describe('automatic graphics quality', () => {
  it('requires sustained pressure and a cooldown before lowering quality', () => {
    let state = initialQuality;
    state = updateQuality(state, 40, 10000);
    state = updateQuality(state, 40, 12000);
    state = updateQuality(state, 40, 14000);
    expect(state.tier).toBe('standard');
    state = updateQuality(state, 40, 32000);
    expect(state.tier).toBe('low');
  });
  it('recovers once after sustained headroom, then settles low if pressure returns', () => {
    const state = { ...initialQuality, tier: 'low' as const, changes: 1, changedAt: 32000 };
    let next = updateQuality(state, 8, 64000);
    for (let i = 1; i < 8; i++) next = updateQuality(next, 8, 64000 + i * 2000);
    expect(next.tier).toBe('standard');
    for (let i = 0; i < 3; i++) next = updateQuality(next, 40, 120000 + i * 2000);
    expect(next.tier).toBe('low');
    for (let i = 0; i < 50; i++) next = updateQuality(next, 8, 200000 + i * 2000);
    expect(next.tier).toBe('low');
  });
  it('ignores invalid samples and unknown stored preferences', () => {
    expect(updateQuality(initialQuality, NaN, 60000)).toBe(initialQuality);
    expect(readQualityPreference('broken')).toBe('auto');
  });
});
