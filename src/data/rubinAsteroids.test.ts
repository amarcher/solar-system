import { describe, expect, it } from 'vitest';
import { rubinAsteroids } from './rubinAsteroids';

describe('rubinAsteroids', () => {
  it('has unique ids and a usable orbit for every curated object', () => {
    expect(new Set(rubinAsteroids.map((a) => a.id)).size).toBe(rubinAsteroids.length);
    for (const a of rubinAsteroids) {
      const { e, q, i, om, w, tpJd } = a.elements;
      for (const value of [e, q, i, om, w, tpJd]) expect(Number.isFinite(value)).toBe(true);
      expect(q).toBeGreaterThan(0);
    }
  });

  it('keeps the only hyperbolic orbit on the interstellar visitor', () => {
    const open = rubinAsteroids.filter((a) => a.elements.e >= 1).map((a) => a.kind);
    expect(open).toEqual(['interstellar']);
  });
});
