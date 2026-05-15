/**
 * Log-compressed AU → scene units for the orrery view.
 * Keeps inner planets visible while preserving relative ordering.
 */
export function scaleAU(au: number): number {
  return Math.sign(au) * Math.log10(1 + Math.abs(au) * 10) * 5;
}

/**
 * Log-compress an AU position vector radially.
 *
 * Applying scaleAU to each axis independently turns circular/elliptical orbits
 * into squarish paths. This preserves the direction from the Sun and compresses
 * only the distance.
 */
export function scaleAUVector(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const distance = Math.hypot(x, y, z);
  if (distance === 0) return { x: 0, y: 0, z: 0 };

  const scaledDistance = scaleAU(distance);
  const factor = scaledDistance / distance;
  return {
    x: x * factor,
    y: y * factor,
    z: z * factor,
  };
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
