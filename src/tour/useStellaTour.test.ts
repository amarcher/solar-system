import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTourPlayer, type TourPhase } from './useStellaTour';
import { TOUR_STEPS, type TourTarget } from './tourScript';
import { getRubinAsteroidById } from '../data/rubinAsteroids';

vi.mock('../utils/analytics', () => ({ trackStellaTour: vi.fn() }));

class FakeAudio {
  src = '';
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  finish() { this.onended?.(); }
}

function setup(audio = new FakeAudio()) {
  const phases: TourPhase[] = [];
  const targets: TourTarget[] = [];
  let step = 0;
  const player = createTourPlayer({
    onPhase: (p) => phases.push(p),
    onStep: (i) => { step = i; },
    createAudio: () => audio as unknown as HTMLAudioElement,
  });
  return { player, audio, phases, targets, step: () => step, scene: (t: TourTarget) => targets.push(t) };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('tour script', () => {
  it('only visits finds that exist', () => {
    for (const step of TOUR_STEPS) {
      if (step.target.findId) expect(getRubinAsteroidById(step.target.findId), step.id).toBeDefined();
    }
  });
});

describe('createTourPlayer', () => {
  it('speaks each line in order, moving on when it ends', async () => {
    const { player, audio, phases, targets, scene } = setup();
    player.start(scene);
    for (let i = 0; i < TOUR_STEPS.length; i++) {
      expect(audio.src).toBe(`/audio/tour/${TOUR_STEPS[i].id}.mp3`);
      audio.finish();
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(targets).toEqual(TOUR_STEPS.map((s) => s.target));
    expect(phases).toEqual(['playing', 'done']);
  });

  it('asks for a tap instead of playing silently when sound is blocked', async () => {
    const audio = new FakeAudio();
    audio.play = vi.fn(() => Promise.reject(new DOMException('blocked', 'NotAllowedError')));
    const { player, phases, scene } = setup(audio);
    player.start(scene);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(phases).toEqual(['playing', 'ready']);
  });

  it('falls back to captions when the audio files are missing, and still finishes', async () => {
    const audio = new FakeAudio();
    audio.play = vi.fn(() => Promise.reject(new DOMException('no source', 'NotSupportedError')));
    const { player, phases, targets, scene } = setup(audio);
    player.start(scene);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(targets).toHaveLength(TOUR_STEPS.length);
    expect(phases.at(-1)).toBe('done');
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it('skips ahead and back, and pauses', async () => {
    const { player, audio, phases, step, scene } = setup();
    player.start(scene);
    player.next();
    player.next();
    expect(step()).toBe(2);
    expect(audio.src).toBe(`/audio/tour/${TOUR_STEPS[2].id}.mp3`);
    player.back();
    expect(step()).toBe(1);
    player.pause();
    audio.finish();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(step()).toBe(1);
    player.resume();
    expect(phases).toEqual(['playing', 'paused', 'playing']);
  });

  it('stops the audio and the scene moves when stopped', async () => {
    const { player, audio, phases, targets, scene } = setup();
    player.start(scene);
    player.stop();
    audio.finish();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(audio.pause).toHaveBeenCalled();
    expect(targets).toHaveLength(1);
    expect(phases).toEqual(['playing', 'idle']);
  });
});
