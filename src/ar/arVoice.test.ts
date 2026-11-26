import { describe, expect, it } from 'vitest';
import { arSceneContext, findBodyId } from './arVoice';

describe('findBodyId', () => {
  it('matches planets and the Sun however they are said', () => {
    expect(findBodyId('Saturn')).toBe('saturn');
    expect(findBodyId(' the sun ')).toBe('sun');
    expect(findBodyId('EARTH')).toBe('earth');
  });

  it('gives nothing for moons, blanks and unknown names', () => {
    expect(findBodyId('Titan')).toBeNull();
    expect(findBodyId('')).toBeNull();
    expect(findBodyId(undefined)).toBeNull();
  });
});

describe('arSceneContext', () => {
  it('describes the room view', () => {
    expect(arSceneContext(null)).toContain('room view');
  });

  it('names the body being visited and gives its facts', () => {
    const context = arSceneContext('mars');
    expect(context).toContain('flew to Mars');
    expect(context).toContain('1. ');
    expect(arSceneContext('sun')).toContain('flew to the Sun');
  });
});
