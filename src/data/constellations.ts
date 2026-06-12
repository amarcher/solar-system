/**
 * Constellation line figures, lazy-loaded from public/data/constellations.json.
 *
 * Data: constellation stick figures from the d3-celestial project
 * (https://github.com/ofrohn/d3-celestial, BSD-3-Clause), derived from
 * Stellarium's Western sky culture. GeoJSON MultiLineStrings with
 * [lon, lat] = [RA in degrees over -180..180, declination in degrees].
 */

export interface Constellation {
  id: string;
  name: string;
  /** 1 = most prominent (Orion, Ursa Major…), 3 = faint */
  rank: number;
  /** Polylines of [raDeg 0..360, decDeg] vertices */
  lines: [number, number][][];
  /** Mean of all vertices — used to anchor the name label */
  center: [number, number];
}

/** IAU three-letter abbreviation → full constellation name. */
export const CONSTELLATION_NAMES: Record<string, string> = {
  And: 'Andromeda', Ant: 'Antlia', Aps: 'Apus', Aqr: 'Aquarius', Aql: 'Aquila',
  Ara: 'Ara', Ari: 'Aries', Aur: 'Auriga', Boo: 'Boötes', Cae: 'Caelum',
  Cam: 'Camelopardalis', Cnc: 'Cancer', CVn: 'Canes Venatici', CMa: 'Canis Major',
  CMi: 'Canis Minor', Cap: 'Capricornus', Car: 'Carina', Cas: 'Cassiopeia',
  Cen: 'Centaurus', Cep: 'Cepheus', Cet: 'Cetus', Cha: 'Chamaeleon',
  Cir: 'Circinus', Col: 'Columba', Com: 'Coma Berenices', CrA: 'Corona Australis',
  CrB: 'Corona Borealis', Crv: 'Corvus', Crt: 'Crater', Cru: 'Crux',
  Cyg: 'Cygnus', Del: 'Delphinus', Dor: 'Dorado', Dra: 'Draco', Equ: 'Equuleus',
  Eri: 'Eridanus', For: 'Fornax', Gem: 'Gemini', Gru: 'Grus', Her: 'Hercules',
  Hor: 'Horologium', Hya: 'Hydra', Hyi: 'Hydrus', Ind: 'Indus', Lac: 'Lacerta',
  Leo: 'Leo', LMi: 'Leo Minor', Lep: 'Lepus', Lib: 'Libra', Lup: 'Lupus',
  Lyn: 'Lynx', Lyr: 'Lyra', Men: 'Mensa', Mic: 'Microscopium', Mon: 'Monoceros',
  Mus: 'Musca', Nor: 'Norma', Oct: 'Octans', Oph: 'Ophiuchus', Ori: 'Orion',
  Pav: 'Pavo', Peg: 'Pegasus', Per: 'Perseus', Phe: 'Phoenix', Pic: 'Pictor',
  Psc: 'Pisces', PsA: 'Piscis Austrinus', Pup: 'Puppis', Pyx: 'Pyxis',
  Ret: 'Reticulum', Sge: 'Sagitta', Sgr: 'Sagittarius', Sco: 'Scorpius',
  Scl: 'Sculptor', Sct: 'Scutum', Ser: 'Serpens', Sex: 'Sextans', Tau: 'Taurus',
  Tel: 'Telescopium', Tri: 'Triangulum', TrA: 'Triangulum Australe',
  Tuc: 'Tucana', UMa: 'Ursa Major', UMi: 'Ursa Minor', Vel: 'Vela',
  Vir: 'Virgo', Vol: 'Volans', Vul: 'Vulpecula',
};

interface LinesGeoJson {
  features: {
    id: string;
    properties: { rank: string };
    geometry: { coordinates: [number, number][][] };
  }[];
}

let cache: Constellation[] | null = null;
let pending: Promise<Constellation[]> | null = null;

export function loadConstellations(): Promise<Constellation[]> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;

  pending = fetch('/data/constellations.json')
    .then((res) => res.json())
    .then((json: LinesGeoJson) => {
      cache = json.features.map((f) => {
        // Normalize RA from -180..180 to 0..360
        const lines = f.geometry.coordinates.map((line) =>
          line.map(([ra, dec]) => [ra < 0 ? ra + 360 : ra, dec] as [number, number]),
        );
        let sumX = 0; let sumY = 0; let sumZ = 0; let n = 0;
        // Average on the unit sphere so RA wrap-around doesn't skew the center
        for (const line of lines) {
          for (const [ra, dec] of line) {
            const raRad = ra * (Math.PI / 180);
            const decRad = dec * (Math.PI / 180);
            sumX += Math.cos(decRad) * Math.cos(raRad);
            sumY += Math.cos(decRad) * Math.sin(raRad);
            sumZ += Math.sin(decRad);
            n++;
          }
        }
        const centerRa = (Math.atan2(sumY / n, sumX / n) * 180) / Math.PI;
        const centerDec = (Math.asin(Math.max(-1, Math.min(1, sumZ / n))) * 180) / Math.PI;
        return {
          id: f.id,
          name: CONSTELLATION_NAMES[f.id] ?? f.id,
          rank: Number(f.properties.rank) || 3,
          lines,
          center: [centerRa < 0 ? centerRa + 360 : centerRa, centerDec],
        };
      });
      return cache;
    });

  return pending;
}
