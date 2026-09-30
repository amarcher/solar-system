import { describe, expect, it } from 'vitest';
import { pathToLandingIntent, pathToNav } from './routes';

describe('pathToLandingIntent', () => {
  it('opens Rubin finds on MN45 from a bare /rubin link', () => {
    expect(pathToLandingIntent('/rubin')).toEqual({ kind: 'rubin', findId: '2025-mn45' });
    expect(pathToLandingIntent('/Rubin/')).toEqual({ kind: 'rubin', findId: '2025-mn45' });
  });

  it('follows a named find', () => {
    expect(pathToLandingIntent('/rubin/2025-pn7')).toEqual({ kind: 'rubin', findId: '2025-pn7' });
  });

  it('still opens the layer for an unknown find', () => {
    expect(pathToLandingIntent('/rubin/not-a-rock')).toEqual({ kind: 'rubin', findId: null });
  });

  it('offers the tour', () => {
    expect(pathToLandingIntent('/tour')).toEqual({ kind: 'tour' });
  });

  it('ignores ordinary routes', () => {
    expect(pathToLandingIntent('/')).toBeNull();
    expect(pathToLandingIntent('/planets/earth')).toBeNull();
  });

  it('lands on the system view', () => {
    expect(pathToNav('/rubin/2025-mn45')).toEqual({ level: 'system' });
    expect(pathToNav('/tour')).toEqual({ level: 'system' });
  });
});
