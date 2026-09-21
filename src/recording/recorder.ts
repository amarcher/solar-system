import { addAfterEffect } from '@react-three/fiber';
import { paintRecordingFrame } from './composition';
import { recordingExtension, supportedRecordingTypes } from './media';
import {
  presentationAt, sameLessonState, RECORDING_DURATION_MS,
  RECORDING_FPS, RECORDING_HEIGHT, RECORDING_WIDTH,
} from './presentation';
import type { CaptureLessonState, LessonCaption, TidesPresentation } from './presentation';

export type RecordingStatus = 'preparing' | 'recording' | 'finishing' | 'complete' | 'cancelled' | 'error';
export interface RecordingResult { blob: Blob; mimeType: string; filename: string }
export interface RecordingOptions {
  sourceCanvas: HTMLCanvasElement;
  applyPresentation: (presentation: TidesPresentation) => void;
  /** Return the state observed by the lesson's latest useFrame, not pending React state. */
  readRenderedState: () => CaptureLessonState | null;
  captionForState: (state: CaptureLessonState) => LessonCaption;
  qualification: string;
  backgroundCredits?: readonly string[];
  /** Restore lesson state, clock, capture layout and camera; called exactly once on every exit. */
  restore: () => void;
  onStatus?: (status: RecordingStatus, message?: string) => void;
}
export interface RecordingHandle {
  finished: Promise<RecordingResult | null>;
  cancel: () => void;
}
/** Small browser boundary, also used by lifecycle tests without a GPU or encoder. */
export interface RecordingRuntime {
  createCanvas: () => HTMLCanvasElement;
  supportedTypes: () => string[];
  createRecorder: (stream: MediaStream, mimeType: string) => MediaRecorder;
  afterRender: (callback: () => void) => () => void;
  now: () => number;
  isHidden: () => boolean;
  watchVisibility: (callback: () => void) => () => void;
}
const browserRuntime: RecordingRuntime = {
  createCanvas: () => document.createElement('canvas'),
  supportedTypes: () => typeof MediaRecorder === 'undefined' ? [] : supportedRecordingTypes(mime => MediaRecorder.isTypeSupported(mime)),
  createRecorder: (stream, mimeType) => new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 }),
  afterRender: callback => addAfterEffect(callback),
  now: () => performance.now(),
  isHidden: () => document.visibilityState !== 'visible',
  watchVisibility: callback => {
    document.addEventListener('visibilitychange', callback);
    window.addEventListener('pagehide', callback);
    return () => {
      document.removeEventListener('visibilitychange', callback);
      window.removeEventListener('pagehide', callback);
    };
  },
};
const activeSources = new WeakSet<HTMLCanvasElement>();

/** Stage the existing R3F canvas in a 9:16 container before starting. No synthetic scene. */
export function startTidesRecording(options: RecordingOptions, runtime: RecordingRuntime = browserRuntime): RecordingHandle {
  if (activeSources.has(options.sourceCanvas)) throw new Error('This canvas is already being recorded.');
  activeSources.add(options.sourceCanvas);
  let resolveResult!: (result: RecordingResult | null) => void;
  const finished = new Promise<RecordingResult | null>(resolve => { resolveResult = resolve; });
  let settled = false;
  let restored = false;
  let stopping = false;
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let removeRender: (() => void) | undefined;
  let removeVisibility: (() => void) | undefined;
  let watchdog: ReturnType<typeof setInterval> | undefined;
  let finishTimeout: ReturnType<typeof setTimeout> | undefined;
  let startTime: number | null = null;
  let lastFrame = runtime.now();
  let lastCapture = -Infinity;
  let requested = presentationAt(0);
  const chunks: Blob[] = [];

  const status = (value: RecordingStatus, message?: string) => {
    // A consumer notification cannot retain an active camera/stream by throwing.
    try { options.onStatus?.(value, message); } catch { /* Notification is best effort. */ }
  };
  const restore = () => {
    if (restored) return;
    restored = true;
    removeRender?.();
    removeRender = undefined;
    removeVisibility?.();
    removeVisibility = undefined;
    clearInterval(watchdog);
    activeSources.delete(options.sourceCanvas);
    options.restore();
  };
  const settle = (result: RecordingResult | null, finalStatus: RecordingStatus, message?: string) => {
    if (settled) return;
    settled = true;
    clearTimeout(finishTimeout);
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      try { if (recorder.state !== 'inactive') recorder.stop(); } catch { /* Tracks still stop below. */ }
    }
    stream?.getTracks().forEach(track => track.stop());
    try { restore(); } catch (error) {
      result = null;
      finalStatus = 'error';
      message = error instanceof Error ? error.message : 'Could not restore the lesson.';
    }
    status(finalStatus, message);
    resolveResult(result);
  };
  const fail = (error: unknown) => settle(null, 'error', error instanceof Error ? error.message : 'Recording failed.');
  const stop = () => {
    if (settled || stopping) return;
    stopping = true;
    status('finishing');
    try {
      restore();
      if (!recorder || recorder.state === 'inactive') throw new Error('The video encoder stopped before completing the reel.');
      finishTimeout = setTimeout(() => fail(new Error('The video encoder did not finish. Please try again.')), 5000);
      recorder.stop();
    } catch (error) { fail(error); }
  };
  const handle: RecordingHandle = { finished, cancel: () => settle(null, 'cancelled') };

  try {
    status('preparing');
    if (runtime.isHidden()) throw new Error('Keep this page visible while recording.');
    const types = runtime.supportedTypes();
    if (!types.length) throw new Error('This browser cannot record video from the canvas.');
    const canvas = runtime.createCanvas();
    canvas.width = RECORDING_WIDTH;
    canvas.height = RECORDING_HEIGHT;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context || typeof canvas.captureStream !== 'function') throw new Error('Canvas video capture is unavailable in this browser.');
    stream = canvas.captureStream(RECORDING_FPS);
    for (const mimeType of types) {
      try { recorder = runtime.createRecorder(stream, mimeType); break; } catch { /* Probe the next supported encoder. */ }
    }
    if (!recorder) throw new Error('No available video encoder could start.');
    recorder.ondataavailable = event => { if (!settled && event.data.size) chunks.push(event.data); };
    recorder.onerror = () => fail(new Error('The browser video encoder failed.'));
    recorder.onstop = () => {
      if (settled) return;
      if (!stopping) { fail(new Error('Recording stopped unexpectedly.')); return; }
      try {
        const mimeType = recorder?.mimeType || chunks.find(chunk => chunk.type)?.type || '';
        const extension = recordingExtension(mimeType);
        const blob = new Blob(chunks, { type: mimeType });
        if (!blob.size) throw new Error('The browser produced an empty recording.');
        settle({ blob, mimeType, filename: `earth-moon-tides.${extension}` }, 'complete');
      } catch (error) { fail(error); }
    };
    options.applyPresentation(requested);
    removeVisibility = runtime.watchVisibility(() => fail(new Error('Recording interrupted when the page left the foreground. Please record again.')));
    removeRender = runtime.afterRender(() => {
      if (settled || stopping) return;
      try {
        const now = runtime.now();
        lastFrame = now;
        if (runtime.isHidden()) throw new Error('Recording interrupted when the page left the foreground.');
        const elapsed = startTime === null ? 0 : now - startTime;
        if (elapsed >= RECORDING_DURATION_MS) { stop(); return; }
        const presentation = presentationAt(elapsed);
        if (presentation.chapter !== requested.chapter) {
          requested = presentation;
          options.applyPresentation(presentation);
        }
        if (!sameLessonState(options.readRenderedState(), presentation.state)) return;
        if (now - lastCapture < 1000 / RECORDING_FPS) return;
        if (!options.sourceCanvas.width || !options.sourceCanvas.height) throw new Error('The lesson canvas is not visible.');
        paintRecordingFrame(context, options.sourceCanvas, presentation, options.captionForState(presentation.state), options.qualification, options.backgroundCredits);
        lastCapture = now;
        if (startTime === null) {
          recorder!.start(1000);
          startTime = now;
          status('recording');
        }
      } catch (error) { fail(error); }
    });
    const preparationTime = runtime.now();
    watchdog = setInterval(() => {
      if (settled || stopping) return;
      const now = runtime.now();
      if (startTime === null && now - preparationTime > 5000) fail(new Error('The lesson did not render in time.'));
      else if (now - lastFrame > 2000 || (startTime !== null && now - lastCapture > 2000)) fail(new Error('The lesson stopped rendering. Please try recording again.'));
      else if (startTime !== null && now - startTime >= RECORDING_DURATION_MS) stop();
    }, 250);
  } catch (error) { fail(error); }
  return handle;
}
