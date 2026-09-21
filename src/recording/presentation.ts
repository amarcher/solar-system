/** Structural contract shared with the lesson; the lesson remains the physics owner. */
export interface CaptureLessonState {
  step: 'gravity' | 'difference' | 'water';
  source: 'moon' | 'sun' | 'both';
  phase: number;
  live?: boolean;
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
  { state: { step: 'gravity', source: 'moon', phase: 0, live: true }, heading: 'The Moon pulls on all of Earth', phaseLabel: 'Moon’s gravity · live scene directions', chapter: 0 },
  { state: { step: 'difference', source: 'moon', phase: 0, live: true }, heading: 'The difference makes the tide', phaseLabel: 'Relative to Earth’s center', chapter: 1 },
  { state: { step: 'water', source: 'both', phase: 0, live: true }, heading: 'The Moon and Sun shape the tide', phaseLabel: 'An ideal global ocean · positions held still', chapter: 2 },
];

/** Milliseconds, clamped to the first/last chapter; no random or wall-clock state. */
export function presentationAt(elapsedMs: number): TidesPresentation {
  const elapsed = Number.isNaN(elapsedMs) ? 0 : elapsedMs;
  const index = Math.min(chapters.length - 1, Math.max(0, Math.floor(elapsed / 6000)));
  const chapter = chapters[index];
  return { ...chapter, state: { ...chapter.state } };
}

export function sameLessonState(a: CaptureLessonState | null, b: CaptureLessonState): boolean {
  return !!a && a.step === b.step && a.source === b.source && a.phase === b.phase && a.live === b.live;
}
