import type { ViewMode } from '../../astronomy/types';

export const WATER_RIPPLE_AMPLITUDE = 0.004;
export const DEFAULT_WATER_PROFILE = { baseRadius: 1.18, tidalAmplitude: 0.22 } as const;
// Keep the exaggerated envelope above Earth's clouds and inside the compact Moon orbit.
const ORRERY_WATER_PROFILE = { baseRadius: 1.08, tidalAmplitude: 0.08 } as const;

export function inlineWaterProfile(mode: ViewMode) {
  return mode === 'orrery' ? ORRERY_WATER_PROFILE : DEFAULT_WATER_PROFILE;
}
