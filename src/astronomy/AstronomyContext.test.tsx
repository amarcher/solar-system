import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AstronomyProvider } from './AstronomyContext';
import { useAstronomy } from './useAstronomy';

const options = vi.hoisted(() => ({ benchmark: false }));
vi.mock('../performance/benchmark', () => ({
  get benchmarkEnabled() { return options.benchmark; },
  BENCHMARK_DATE: '2026-09-21T00:00:00Z',
}));

function ClockState() {
  const { mode, rate } = useAstronomy();
  return <output>{mode}:{rate}</output>;
}

function initialClock(reducedMotion = false) {
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' && reducedMotion }),
  });
  return renderToStaticMarkup(<AstronomyProvider><ClockState /></AstronomyProvider>);
}

afterEach(() => {
  options.benchmark = false;
  vi.unstubAllGlobals();
});

describe('initial astronomy clock', () => {
  it('opens Orrery at one day per second', () => {
    expect(initialClock()).toBe('<output>orrery:86400</output>');
  });

  it('starts paused when reduced motion is requested', () => {
    expect(initialClock(true)).toBe('<output>orrery:0</output>');
  });

  it('keeps benchmark captures paused', () => {
    options.benchmark = true;
    expect(initialClock()).toBe('<output>orrery:0</output>');
  });
});
