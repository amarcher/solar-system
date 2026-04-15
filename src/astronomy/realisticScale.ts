/**
 * Log-compressed AU → scene units for the orrery view.
 * Keeps inner planets visible while preserving relative ordering.
 */
export function scaleAU(au: number): number {
  return Math.sign(au) * Math.log10(1 + Math.abs(au) * 10) * 5;
}

/**
 * Planet visual radius in orrery mode.
 * Exaggerated 50× from true proportion so planets remain visible.
 */
export function scaleRealisticRadius(diameterKm: number): number {
  // Real planet diameter in AU, then exaggerate
  const realRadiusAU = (diameterKm / 2) / 149_597_870.7;
  const exaggerated = realRadiusAU * 50;
  // Apply same log compression as distances, with a minimum size
  return Math.max(0.08, scaleAU(exaggerated) * 2);
}
