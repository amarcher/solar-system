import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { presentationAt, RECORDING_CREDITS, RECORDING_DURATION_MS } from './presentation';
import type { CaptureLessonState } from './presentation';
import { RecordingPreviewUrl, recordingExtension, supportedRecordingTypes } from './media';
import { startTidesRecording } from './recorder';
import type { RecordingOptions, RecordingRuntime } from './recorder';

class FakeRecorder {
  state = 'inactive';
  mimeType = 'video/webm;codecs=vp8';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start = vi.fn(() => { this.state = 'recording'; });
  stop = vi.fn(() => {
    this.state = 'inactive';
    queueMicrotask(() => {
      this.ondataavailable?.({ data: new Blob(['actual encoded frame'], { type: this.mimeType }) });
      this.onstop?.();
    });
  });
}
function setup() {
  let now = 0;
  let afterRender: (() => void) | null = null;
  let visibility: (() => void) | null = null;
  let rendered: CaptureLessonState | null = null;
  const source = { width: 720, height: 1280 } as HTMLCanvasElement;
  const context = {
    fillRect: vi.fn(), drawImage: vi.fn(), fillText: vi.fn(),
    measureText: (text: string) => ({ width: text.length * 11 }),
  } as unknown as CanvasRenderingContext2D;
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const captureStream = vi.fn(() => stream);
  const canvas = { width: 0, height: 0, getContext: () => context, captureStream } as unknown as HTMLCanvasElement;
  const recorder = new FakeRecorder();
  const removeRender = vi.fn(() => { afterRender = null; });
  const removeVisibility = vi.fn(() => { visibility = null; });
  const runtime: RecordingRuntime = {
    createCanvas: () => canvas,
    supportedTypes: () => ['video/mp4', 'video/webm;codecs=vp8'],
    createRecorder: vi.fn((_stream: MediaStream, mime: string) => {
      if (mime === 'video/mp4') throw new Error('No MP4 encoder available');
      return recorder as unknown as MediaRecorder;
    }),
    afterRender: fn => { afterRender = fn; return removeRender; },
    now: () => now,
    isHidden: () => false,
    watchVisibility: fn => { visibility = fn; return removeVisibility; },
  };
  const options: RecordingOptions = {
    sourceCanvas: source,
    applyPresentation: vi.fn(presentation => { rendered = presentation.state; }),
    readRenderedState: () => rendered,
    captionForState: state => ({ title: state.step, explanation: `Explanation ${state.step}`, legend: `Legend ${state.source}` }),
    qualification: 'Water shape exaggerated. This simplified model leaves out coastlines and ocean depth.',
    restore: vi.fn(),
    onStatus: vi.fn(),
  };
  return {
    runtime, options, recorder, context, source, canvas, track, captureStream, removeRender, removeVisibility,
    setRendered: (state: CaptureLessonState | null) => { rendered = state; },
    frame: (time: number) => { now = time; afterRender?.(); },
    background: () => visibility?.(),
  };
}

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] }));
afterEach(() => { vi.useRealTimers(); });

describe('tides presentation', () => {
  it('teaches attraction, differential gravity, two bulges and both spring alignments before neap', () => {
    const states = [0, 3000, 6000, 9000, 12000, 15000].map(time => presentationAt(time).state);
    expect(states).toEqual([
      { step: 'gravity', source: 'moon', phase: 0 },
      { step: 'difference', source: 'moon', phase: 0 },
      { step: 'water', source: 'moon', phase: 0 },
      { step: 'water', source: 'both', phase: 0 },
      { step: 'water', source: 'both', phase: 180 },
      { step: 'water', source: 'both', phase: 90 },
    ]);
    expect(presentationAt(2999).chapter).toBe(0);
    expect(presentationAt(-100).chapter).toBe(0);
    expect(presentationAt(NaN).chapter).toBe(0);
    expect(presentationAt(RECORDING_DURATION_MS).chapter).toBe(5);
    const mutated = presentationAt(0);
    mutated.state.phase = 200;
    expect(presentationAt(0).state.phase).toBe(0);
  });
});

describe('actual canvas recorder lifecycle', () => {
  it('copies only a rendered matching state after rendering, with visible qualification and credits', async () => {
    const env = setup();
    const handle = startTidesRecording(env.options, env.runtime);
    env.setRendered(null);
    env.frame(0);
    expect(env.recorder.start).not.toHaveBeenCalled();
    expect(env.context.drawImage).not.toHaveBeenCalled();
    env.setRendered(presentationAt(0).state);
    env.frame(40);
    expect(env.context.drawImage).toHaveBeenCalledWith(env.source, 0, 0, 720, 1280);
    expect(env.recorder.start).toHaveBeenCalledOnce();
    expect(env.captureStream).toHaveBeenCalledWith(30);
    const text = vi.mocked(env.context.fillText).mock.calls.map(call => call[0]).join(' ');
    expect(text).toContain(env.options.qualification);
    expect(text).toContain(RECORDING_CREDITS);
    env.frame(50);
    expect(env.context.drawImage).toHaveBeenCalledTimes(1);
    handle.cancel();
    expect(await handle.finished).toBeNull();
    expect(env.options.restore).toHaveBeenCalledOnce();
    expect(env.track.stop).toHaveBeenCalledOnce();
    expect(env.removeRender).toHaveBeenCalledOnce();
    expect(env.removeVisibility).toHaveBeenCalledOnce();
  });

  it('returns the encoder’s actual container, finishes at 18 seconds, and restores once', async () => {
    const env = setup();
    const handle = startTidesRecording(env.options, env.runtime);
    env.frame(0);
    for (let time = 1000; time <= RECORDING_DURATION_MS; time += 1000) env.frame(time);
    const result = await handle.finished;
    expect(result?.filename).toBe('earth-moon-tides.webm');
    expect(result?.blob.type).toBe('video/webm;codecs=vp8');
    expect(result?.blob.size).toBeGreaterThan(0);
    expect(env.options.restore).toHaveBeenCalledOnce();
    expect(env.options.onStatus).toHaveBeenLastCalledWith('complete', undefined);
    handle.cancel();
    expect(env.options.restore).toHaveBeenCalledOnce();
  });

  it('never paints a new chapter over stale lesson pixels', async () => {
    const env = setup();
    const handle = startTidesRecording(env.options, env.runtime);
    env.frame(0);
    vi.mocked(env.options.applyPresentation).mockImplementation(() => {});
    env.frame(3000);
    expect(env.context.drawImage).toHaveBeenCalledTimes(1);
    env.setRendered(presentationAt(3000).state);
    env.frame(3040);
    expect(env.context.drawImage).toHaveBeenCalledTimes(2);
    handle.cancel();
    await handle.finished;
  });

  it('invalidates background recordings and ignores late encoder events', async () => {
    const env = setup();
    const handle = startTidesRecording(env.options, env.runtime);
    env.frame(0);
    env.background();
    expect(await handle.finished).toBeNull();
    expect(env.options.onStatus).toHaveBeenLastCalledWith('error', expect.stringContaining('foreground'));
    expect(env.removeRender).toHaveBeenCalledOnce();
    expect(env.track.stop).toHaveBeenCalledOnce();
    expect(env.options.restore).toHaveBeenCalledOnce();
    expect(env.recorder.onstop).toBeNull();
  });

  it('cleans up after source canvas security errors and encoder errors', async () => {
    for (const failure of ['canvas', 'encoder']) {
      const env = setup();
      const handle = startTidesRecording(env.options, env.runtime);
      if (failure === 'canvas') vi.mocked(env.context.drawImage).mockImplementation(() => { throw new Error('Tainted canvas'); });
      env.frame(0);
      if (failure === 'encoder') env.recorder.onerror?.();
      expect(await handle.finished).toBeNull();
      expect(env.options.restore).toHaveBeenCalledOnce();
      expect(env.track.stop).toHaveBeenCalledOnce();
    }
  });

  it('restores unsupported browsers and cancelled preparation without starting an encoder', async () => {
    const unsupported = setup();
    unsupported.runtime.supportedTypes = () => [];
    expect(await startTidesRecording(unsupported.options, unsupported.runtime).finished).toBeNull();
    expect(unsupported.options.restore).toHaveBeenCalledOnce();
    const preparing = setup();
    const handle = startTidesRecording(preparing.options, preparing.runtime);
    handle.cancel();
    expect(await handle.finished).toBeNull();
    expect(preparing.recorder.start).not.toHaveBeenCalled();
    expect(preparing.options.restore).toHaveBeenCalledOnce();
  });

  it('restores when preparation receives no matching frames', async () => {
    const env = setup();
    const handle = startTidesRecording(env.options, env.runtime);
    env.setRendered(null);
    env.frame(6000);
    vi.advanceTimersByTime(250);
    expect(await handle.finished).toBeNull();
    expect(env.options.onStatus).toHaveBeenLastCalledWith('error', expect.stringContaining('did not render'));
    expect(env.options.restore).toHaveBeenCalledOnce();
  });

  it('rejects empty encoder output and a missing final encoder event', async () => {
    for (const failure of ['empty', 'timeout']) {
      const env = setup();
      env.recorder.stop.mockImplementation(() => {
        env.recorder.state = 'inactive';
        if (failure === 'empty') queueMicrotask(() => env.recorder.onstop?.());
      });
      const handle = startTidesRecording(env.options, env.runtime);
      env.frame(0);
      env.frame(RECORDING_DURATION_MS);
      if (failure === 'timeout') vi.advanceTimersByTime(5000);
      expect(await handle.finished).toBeNull();
      expect(env.options.restore).toHaveBeenCalledOnce();
      expect(env.track.stop).toHaveBeenCalledOnce();
    }
  });

  it('rejects duplicate recordings of one canvas without disturbing the existing capture', async () => {
    const env = setup();
    const handle = startTidesRecording(env.options, env.runtime);
    expect(() => startTidesRecording(env.options, env.runtime)).toThrow('already being recorded');
    expect(env.options.restore).not.toHaveBeenCalled();
    handle.cancel();
    await handle.finished;
  });

  it('times out a stalled matching state', async () => {
    const env = setup();
    const handle = startTidesRecording(env.options, env.runtime);
    env.frame(0);
    vi.mocked(env.options.applyPresentation).mockImplementation(() => {});
    env.frame(3000);
    vi.advanceTimersByTime(250);
    expect(await handle.finished).toBeNull();
    expect(env.options.restore).toHaveBeenCalledOnce();
  });
});

describe('recording media and URL ownership', () => {
  it('detects supported formats and derives extension from actual MIME', () => {
    expect(supportedRecordingTypes(mime => mime === 'video/webm')).toEqual(['video/webm']);
    expect(recordingExtension('video/mp4;codecs=avc1')).toBe('mp4');
    expect(recordingExtension('video/webm')).toBe('webm');
    expect(() => recordingExtension('video/unknown')).toThrow();
  });
  it('revokes replaced and disposed preview URLs exactly once', () => {
    const urls = { createObjectURL: vi.fn().mockReturnValueOnce('blob:one').mockReturnValueOnce('blob:two'), revokeObjectURL: vi.fn() };
    const owner = new RecordingPreviewUrl(urls);
    owner.replace(new Blob(['one']));
    expect(owner.replace(new Blob(['two']))).toBe('blob:two');
    owner.dispose();
    owner.dispose();
    expect(urls.revokeObjectURL.mock.calls).toEqual([['blob:one'], ['blob:two']]);
  });
});
