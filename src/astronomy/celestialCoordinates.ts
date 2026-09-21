import { Matrix4 } from 'three';

export type CelestialFrame = 'ecliptic' | 'horizon';

export function equatorialToCartesian(raDegrees: number, decDegrees: number, radius = 1): [number, number, number] {
  const ra = raDegrees * Math.PI / 180;
  const dec = decDegrees * Math.PI / 180;
  return [radius * Math.cos(dec) * Math.cos(ra), radius * Math.sin(dec), -radius * Math.cos(dec) * Math.sin(ra)];
}

/** NASA raster: RA increases left; y is measured down from the image top. */
export function equatorialToSkyUV(raDegrees: number, decDegrees: number): [number, number] {
  return [((0.5 - raDegrees / 360) % 1 + 1) % 1, 0.5 - decDegrees / 180];
}

/** Engine matrices index source axis first. Our equatorial scene basis is (X,Z,-Y). */
export function celestialRotationMatrix(rotation: number[][], frame: CelestialFrame, target = new Matrix4()): Matrix4 {
  const r = rotation;
  if (frame === 'horizon') {
    // Engine HOR=(north,west,zenith); scene=(east,up,south).
    return target.set(
      -r[0][1], -r[2][1], r[1][1], 0,
      r[0][2], r[2][2], -r[1][2], 0,
      -r[0][0], -r[2][0], r[1][0], 0,
      0, 0, 0, 1,
    );
  }
  return target.set(
    r[0][0], r[2][0], -r[1][0], 0,
    r[0][2], r[2][2], -r[1][2], 0,
    -r[0][1], -r[2][1], r[1][1], 0,
    0, 0, 0, 1,
  );
}

export function starAppearance(magnitude: number): { size: number; brightness: number } {
  const prominence = Math.max(0, Math.min(1, (6.5 - magnitude) / 8));
  return { size: 1.2 + 4.8 * prominence ** 2, brightness: 0.15 + 0.85 * prominence ** 1.4 };
}
