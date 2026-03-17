/**
 * Non-linear scaling utilities for the 3D scene.
 * Real solar system distances would make inner planets invisible,
 * so we use artistic scaling.
 */

/** Compress orbit distances so inner and outer planets are all visible */
export function scaleOrbitRadius(au: number): number {
  // sqrt compression — keeps inner planets visible while outer ones don't fly off screen
  return 4 + Math.sqrt(au) * 8;
}

/** Compress planet radii so small planets are still clickable */
export function scaleVisualRadius(diameterKm: number): number {
  // Log scale — Jupiter is ~11x Earth's diameter, but we want maybe 3-4x visual difference
  return 0.15 + Math.log10(diameterKm / 4000) * 0.4;
}

/** Orbit speed inversely proportional to sqrt of distance (Kepler-ish) */
export function scaleOrbitSpeed(orbitalPeriodDays: number): number {
  return 0.3 / Math.sqrt(orbitalPeriodDays / 365);
}
