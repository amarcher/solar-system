import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { GraphicsQualityContext } from './useGraphicsQuality';
import { initialQuality, QUALITY_SETTINGS, readQualityPreference, updateQuality, type QualityPreference } from './qualityPolicy';

export function GraphicsQualityProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<QualityPreference>(() => {
    try { return readQualityPreference(localStorage.getItem('graphics-quality')); }
    catch { return 'auto'; }
  });
  const [history, setHistory] = useState(initialQuality);
  const setPreference = useCallback((value: QualityPreference) => {
    setPreferenceState(value);
    setHistory({ ...initialQuality, changedAt: performance.now() });
    try { localStorage.setItem('graphics-quality', value); } catch { /* Storage may be unavailable. */ }
  }, []);
  const reportFrameWindow = useCallback((p95Ms: number) => {
    if (preference === 'auto') setHistory((previous) => updateQuality(previous, p95Ms, performance.now()));
  }, [preference]);
  const tier = preference === 'smooth' ? 'low' : preference === 'detailed' ? 'standard' : history.tier;
  const value = useMemo(() => ({ preference, tier, settings: QUALITY_SETTINGS[tier], setPreference, reportFrameWindow }), [preference, tier, setPreference, reportFrameWindow]);
  return <GraphicsQualityContext.Provider value={value}>{children}</GraphicsQualityContext.Provider>;
}
