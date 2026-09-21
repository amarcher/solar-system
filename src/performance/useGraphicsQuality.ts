import { createContext, useContext } from 'react';
import { QUALITY_SETTINGS, type QualityPreference, type QualityTier } from './qualityPolicy';

export interface GraphicsQuality {
  preference: QualityPreference;
  tier: QualityTier;
  settings: typeof QUALITY_SETTINGS[QualityTier];
  setPreference: (value: QualityPreference) => void;
  reportFrameWindow: (p95Ms: number) => void;
}

export const GraphicsQualityContext = createContext<GraphicsQuality | null>(null);

export function useGraphicsQuality() {
  const quality = useContext(GraphicsQualityContext);
  if (!quality) throw new Error('GraphicsQualityProvider is missing');
  return quality;
}
