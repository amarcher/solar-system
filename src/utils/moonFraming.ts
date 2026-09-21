import type { ViewMode } from '../astronomy/types';
import { lunarOrreryBodyRadius } from '../astronomy/lunarOrrery';

/** Shared by moon geometry and camera framing; these are illustrative scene units. */
export function moonVisualRadius(diameterKm: number, moonId?: string, mode: ViewMode = 'artistic'): number {
  if (moonId === 'moon' && mode === 'orrery') return lunarOrreryBodyRadius(diameterKm);
  return Math.max(diameterKm / 25000, 0.04);
}

/** Fit a readable disk in the space between desktop panels or within a phone screen. */
export function moonFocusDistance(radius: number, verticalFovDegrees: number, width: number, height: number): number {
  const panelWidth = width >= 900 ? Math.min(340, width * 0.3) : 0;
  const availableWidth = Math.max(1, width - panelWidth * 2);
  const diskPixels = Math.min(240, availableWidth * 0.55, height * 0.38);
  const angularRadius = Math.atan((diskPixels / Math.max(1, height)) * Math.tan(verticalFovDegrees * Math.PI / 360));
  return radius / Math.sin(angularRadius);
}
