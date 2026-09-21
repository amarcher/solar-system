export type QualityPreference = 'auto' | 'smooth' | 'detailed';
export type QualityTier = 'low' | 'standard';

export const QUALITY_SETTINGS = {
  low: { dpr: 1, bloom: false, skyWidth: 2048, bodyWidth: 1024 },
  standard: { dpr: 1.5, bloom: true, skyWidth: 4096, bodyWidth: 2048 },
} as const;

export interface QualityHistory {
  tier: QualityTier;
  slow: number;
  fast: number;
  changes: number;
  changedAt: number;
}

export const initialQuality: QualityHistory = { tier: 'standard', slow: 0, fast: 0, changes: 0, changedAt: 0 };

export function updateQuality(history: QualityHistory, p95Ms: number, now: number): QualityHistory {
  if (!Number.isFinite(p95Ms) || p95Ms <= 0 || history.changes >= 3) return history;
  const slow = p95Ms > 28 ? history.slow + 1 : 0;
  const fast = p95Ms < 18 ? history.fast + 1 : 0;
  const cooled = now - history.changedAt >= 30000;
  if (history.tier === 'standard' && slow >= 3 && cooled) {
    return { tier: 'low', slow: 0, fast: 0, changes: history.changes + 1, changedAt: now };
  }
  if (history.tier === 'low' && fast >= 8 && cooled && history.changes < 2) {
    return { tier: 'standard', slow: 0, fast: 0, changes: history.changes + 1, changedAt: now };
  }
  return { ...history, slow, fast };
}

export function readQualityPreference(value: string | null): QualityPreference {
  return value === 'smooth' || value === 'detailed' ? value : 'auto';
}
