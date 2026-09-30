import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTourPlayer, type TourPhase } from './useStellaTour';
import { TOUR_STEPS, type TourTarget } from './tourScript';

vi.mock('../utils/analytics', () => ({ trackStellaTour: vi.fn() }));

class FakeAudio {
  src = '';
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  finish() { this.onended?.(); }
}

function setup(audio = new FakeAudio()) {
  const phases: TourPhase[] = [];
  const targets: TourTarget[] = [];
  const player = createTourPlayer({
    onPhase: (p) => phases.push(p),
    onStep: () => {},
    createAudio: () => audio as unknown as HTMLAudioElement,
  });
  return { player, audio, phases, targets, moveScene: (t: TourTarget) => targets.push(t) };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('createTourPlayer', () => {
  it('plays each line in order and finishes', async () => {
    const { player, audio, phases, targets, moveScene } = setup();
    player.start(moveScene);
    for (let i = 0; i < TOUR_STEPS.length; i++) {
      expect(audio.src).toBe(`/audio/tour/${TOUR_STEPS[i].id}.mp3`);
      audio.finish();
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(targets).toEqual(TOUR_STEPS.map((s) => s.target));
    expect(phases).toEqual(['playing', 'done']);
  });

  it('falls back to captions when audio cannot play, and still finishes', async () => {
    const audio = new FakeAudio();
    audio.play = vi.fn(() => Promise.reject(new DOMException('blocked', 'NotAllowedError')));
    const { player, phases, targets, moveScene } = setup(audio);
    player.start(moveScene);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(targets).toHaveLength(TOUR_STEPS.length);
    expect(phases.at(-1)).toBe('done');
    // After the first failure it stops retrying audio.
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it('stops the audio and the scene moves when stopped', async () => {
    const { player, audio, phases, targets, moveScene } = setup();
    player.start(moveScene);
    player.stop();
    audio.finish();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(audio.pause).toHaveBeenCalled();
    expect(targets).toHaveLength(1);
    expect(phases).toEqual(['playing', 'idle']);
  });

  it('only offers the start card when idle', () => {
    const { player, phases, moveScene } = setup();
    player.offer();
    player.start(moveScene);
    player.offer();
    expect(phases).toEqual(['ready', 'playing']);
  });
});
