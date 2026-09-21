/** Structural contract shared with the lesson; the lesson remains the physics owner. */
export interface CaptureLessonState {
  step: 'gravity' | 'difference' | 'water';
  source: 'moon' | 'sun' | 'both';
  phase: number;
}
export interface LessonCaption { title: string; explanation: string; legend: string }
export interface TidesPresentation {
  state: CaptureLessonState;
  heading: string;
  phaseLabel: string;
  chapter: number;
}
export const RECORDING_DURATION_MS = 18_000;
export const RECORDING_WIDTH = 720;
export const RECORDING_HEIGHT = 1280;
export const RECORDING_FPS = 30;
export const RECORDING_CREDITS = 'Earth + Moon: Solar System Scope · CC BY 4.0';

const chapters: readonly TidesPresentation[] = [
  { state: { step: 'gravity', source: 'moon', phase: 0 }, heading: 'The Moon pulls on all of Earth', phaseLabel: 'Moon’s gravity', chapter: 0 },
  { state: { step: 'difference', source: 'moon', phase: 0 }, heading: 'The difference makes the tide', phaseLabel: 'Relative to Earth’s center', chapter: 1 },
  { state: { step: 'water', source: 'moon', phase: 0 }, heading: 'Two sides rise', phaseLabel: 'An ideal global ocean', chapter: 2 },
  { state: { step: 'water', source: 'both', phase: 0 }, heading: 'New Moon: spring tides', phaseLabel: 'Aligned effects · larger tidal range', chapter: 3 },
  { state: { step: 'water', source: 'both', phase: 180 }, heading: 'Full Moon: spring tides', phaseLabel: 'Aligned effects · larger tidal range', chapter: 4 },
  { state: { step: 'water', source: 'both', phase: 90 }, heading: 'Quarter Moon: neap tides', phaseLabel: 'Smaller tidal range · tides remain', chapter: 5 },
];

/** Milliseconds, clamped to the first/last chapter; no random or wall-clock state. */
export function presentationAt(elapsedMs: number): TidesPresentation {
  const elapsed = Number.isNaN(elapsedMs) ? 0 : elapsedMs;
  const index = Math.min(chapters.length - 1, Math.max(0, Math.floor(elapsed / 3000)));
  const chapter = chapters[index];
  return { ...chapter, state: { ...chapter.state } };
}

export function sameLessonState(a: CaptureLessonState | null, b: CaptureLessonState): boolean {
  return !!a && a.step === b.step && a.source === b.source && a.phase === b.phase;
}
