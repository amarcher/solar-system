import { useEffect, useState } from 'react';
import { TOUR_STEPS, fallbackDurationMs, tourAudioSrc, type TourTarget } from './tourScript';
import { trackStellaTour } from '../utils/analytics';

/** idle: nothing on screen. ready: a start card (a link can't autoplay audio). playing / done: the caption card. */
export type TourPhase = 'idle' | 'ready' | 'playing' | 'done';

/** Breath between lines so the camera can arrive before Stella talks about it. */
const STEP_GAP_MS = 900;

interface PlayerHooks {
  onPhase: (phase: TourPhase) => void;
  onStep: (index: number) => void;
  createAudio?: () => HTMLAudioElement;
}

/**
 * Plays the tour line by line on one audio element, advancing when each line
 * ends. Once audio fails (blocked, missing file, no network) the rest of the
 * tour runs on caption timing, so it always finishes.
 */
export function createTourPlayer({ onPhase, onStep, createAudio = () => new Audio() }: PlayerHooks) {
  let phase: TourPhase = 'idle';
  let stepIndex = 0;
  let audio: HTMLAudioElement | null = null;
  let audioOk = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onTarget: (target: TourTarget) => void = () => {};

  const setPhase = (next: TourPhase) => { phase = next; onPhase(next); };
  const stepId = () => TOUR_STEPS[stepIndex].id;

  const silence = () => {
    clearTimeout(timer);
    if (audio) { audio.onended = null; audio.onerror = null; audio.pause(); }
  };

  const playStep = (index: number) => {
    clearTimeout(timer);
    stepIndex = index;
    const step = TOUR_STEPS[index];
    onStep(index);
    onTarget(step.target);

    const next = () => {
      clearTimeout(timer);
      if (index + 1 < TOUR_STEPS.length) {
        timer = setTimeout(() => playStep(index + 1), STEP_GAP_MS);
      } else {
        setPhase('done');
        trackStellaTour('completed', step.id, audioOk);
      }
    };
    const captionsOnly = () => {
      audioOk = false;
      if (audio) { audio.onended = null; audio.onerror = null; }
      timer = setTimeout(next, fallbackDurationMs(step.text));
    };

    if (!audio || !audioOk) { captionsOnly(); return; }
    audio.onended = next;
    audio.onerror = captionsOnly;
    audio.src = tourAudioSrc(step);
    audio.play().catch((err: unknown) => {
      // A newer line replaced this one mid-load; that line handles itself.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (stepIndex === index && phase === 'playing') captionsOnly();
    });
  };

  return {
    /**
     * Must run inside a tap or click: iOS only unlocks an audio element during
     * a user gesture. `moveScene` points the scene at each line's subject.
     */
    start(moveScene: (target: TourTarget) => void) {
      silence();
      onTarget = moveScene;
      audio ??= createAudio();
      audioOk = true;
      setPhase('playing');
      trackStellaTour('started', TOUR_STEPS[0].id, true);
      playStep(0);
    },
    offer() {
      if (phase === 'idle') setPhase('ready');
    },
    stop() {
      silence();
      if (phase === 'playing') trackStellaTour('stopped', stepId(), audioOk);
      setPhase('idle');
    },
    /** The visitor chose to talk to Stella from the tour card. */
    talk() {
      silence();
      trackStellaTour('talk', stepId(), audioOk);
      setPhase('idle');
    },
    dispose: silence,
  };
}

export function useStellaTour() {
  const [phase, setPhase] = useState<TourPhase>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [player] = useState(() => createTourPlayer({ onPhase: setPhase, onStep: setStepIndex }));
  useEffect(() => player.dispose, [player]);

  return {
    phase,
    step: TOUR_STEPS[stepIndex],
    stepIndex,
    total: TOUR_STEPS.length,
    start: player.start,
    offer: player.offer,
    stop: player.stop,
    talk: player.talk,
  };
}
