export interface StarCatalog {
  /** [ra_deg, dec_deg, magnitude, colorTemp][] */
  stars: [number, number, number, number][];
  /** Named bright stars */
  named: { n: string; ra: number; dec: number }[];
}

let cached: StarCatalog | null = null;
let loading: Promise<StarCatalog> | null = null;

export async function loadStarCatalog(): Promise<StarCatalog> {
  if (cached) return cached;
  if (!loading) {
    loading = fetch('/data/bright_stars.json')
      .then((r) => r.json())
      .then((data: StarCatalog) => {
        cached = data;
        return data;
      });
  }
  return loading;
}

export function getStarCatalog(): StarCatalog | null {
  return cached;
}
