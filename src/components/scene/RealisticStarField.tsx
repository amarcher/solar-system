import { useEffect, useMemo, useRef, useState } from 'react';
import { AdditiveBlending, Points as ThreePoints } from 'three';
import { loadStarCatalog, type StarCatalog } from '../../data/stars';

const DEG2RAD = Math.PI / 180;
const SPHERE_RADIUS = 200;

/**
 * Convert color temperature (K) to an approximate RGB color.
 * Based on Tanner Helland's algorithm.
 */
function colorTempToRGB(temp: number): [number, number, number] {
  const t = temp / 100;
  let r: number, g: number, b: number;

  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }

  return [
    Math.max(0, Math.min(255, r)) / 255,
    Math.max(0, Math.min(255, g)) / 255,
    Math.max(0, Math.min(255, b)) / 255,
  ];
}

/**
 * Convert equatorial RA/Dec to Cartesian on a sphere.
 */
function equatorialToCartesian(raDeg: number, decDeg: number, radius: number): [number, number, number] {
  const ra = raDeg * DEG2RAD;
  const dec = decDeg * DEG2RAD;
  const cosDec = Math.cos(dec);
  return [
    radius * cosDec * Math.cos(ra),
    radius * Math.sin(dec),
    -radius * cosDec * Math.sin(ra),
  ];
}

export function RealisticStarField() {
  const [catalog, setCatalog] = useState<StarCatalog | null>(null);
  const pointsRef = useRef<ThreePoints>(null);

  useEffect(() => {
    loadStarCatalog().then(setCatalog);
  }, []);

  const { positions, colors, sizes } = useMemo(() => {
    if (!catalog) return { positions: null, colors: null, sizes: null };

    const count = catalog.stars.length;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const [raDeg, decDeg, mag, colorTemp] = catalog.stars[i];

      // Position on celestial sphere
      const [x, y, z] = equatorialToCartesian(raDeg, decDeg, SPHERE_RADIUS);
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Color from temperature
      const [r, g, b] = colorTempToRGB(colorTemp);
      col[i * 3] = r;
      col[i * 3 + 1] = g;
      col[i * 3 + 2] = b;

      // Size: brighter stars = larger points
      // Magnitude scale is inverted (lower = brighter)
      // Map mag range [-1.5, 6.5] → size range [4.0, 0.5]
      const normalized = (mag + 1.5) / 8.0; // 0 = brightest, 1 = dimmest
      siz[i] = 4.0 * Math.pow(1 - normalized, 2) + 0.5;
    }

    return { positions: pos, colors: col, sizes: siz };
  }, [catalog]);

  if (!positions || !colors || !sizes) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={1.5}
        sizeAttenuation={false}
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
