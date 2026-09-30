import { useEffect, useState } from 'react';
import { TOUR_STEPS, fallbackDurationMs, tourAudioSrc, type TourTarget } from './tourScript';
import { trackStellaTour } from '../utils/analytics';

/**
 * idle: nothing on screen. ready: a start card, shown when the browser won't
 * play sound until the visitor taps. playing / paused / done: the caption card.
 */
export type TourPhase = 'idle' | 'ready' | 'playing' | 'paused' | 'done';

/** Breath between lines so the camera can arrive before Stella talks about it. */
const STEP_GAP_MS = 900;

interface PlayerHooks {
  onPhase: (phase: TourPhase) => void;
  onStep: (index: number) => void;
  createAudio?: () => HTMLAudioElement;
}

/**
 * Plays the tour line by line on one audio element, moving on when each line
 * ends. If the audio files can't load, lines advance on caption timing instead.
 */
export function createTourPlayer({ onPhase, onStep, createAudio = () => new Audio() }: PlayerHooks) {
  let phase: TourPhase = 'idle';
  let stepIndex = 0;
  let audio: HTMLAudioElement | null = null;
  let audioOk = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let moveScene: (target: TourTarget) => void = () => {};

  const setPhase = (next: TourPhase) => { phase = next; onPhase(next); };
  const stepId = () => TOUR_STEPS[stepIndex].id;

  const silence = () => {
    clearTimeout(timer);
    if (audio) { audio.onended = null; audio.onerror = null; audio.pause(); }
  };

  const advance = () => {
    clearTimeout(timer);
    if (stepIndex + 1 < TOUR_STEPS.length) {
      timer = setTimeout(() => showStep(stepIndex + 1), STEP_GAP_MS);
    } else {
      setPhase('done');
      trackStellaTour('completed', stepId(), audioOk);
    }
  };

  /** Speak (or time) the current line from the start. */
  const speak = () => {
    clearTimeout(timer);
    const step = TOUR_STEPS[stepIndex];
    const index = stepIndex;
    const captionsOnly = () => {
      audioOk = false;
      if (audio) { audio.onended = null; audio.onerror = null; }
      timer = setTimeout(advance, fallbackDurationMs(step.text));
    };
    if (!audio || !audioOk) { captionsOnly(); return; }

    audio.onended = advance;
    audio.onerror = captionsOnly;
    const src = tourAudioSrc(step);
    if (!audio.src.endsWith(src)) audio.src = src;
    else audio.currentTime = 0;
    audio.play().catch((err: unknown) => {
      if (stepIndex !== index || phase !== 'playing') return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        // No sound without a tap: ask for one rather than play a silent tour.
        silence();
        setPhase('ready');
        return;
      }
      captionsOnly();
    });
  };

  const showStep = (index: number) => {
    silence();
    stepIndex = index;
    onStep(index);
    moveScene(TOUR_STEPS[index].target);
    if (phase === 'playing') speak();
  };

  return {
    /**
     * Start from the top. Call it inside a tap to be sure of sound: browsers
     * only allow audio after a user gesture. Without one, the tour tries
     * anyway and falls back to a start card if sound is blocked.
     * `scene` points the scene at each line's subject.
     */
    start(scene: (target: TourTarget) => void) {
      silence();
      moveScene = scene;
      audio ??= createAudio();
      audioOk = true;
      setPhase('playing');
      trackStellaTour('started', TOUR_STEPS[0].id, true);
      showStep(0);
    },
    pause() {
      if (phase !== 'playing') return;
      silence();
      setPhase('paused');
    },
    resume() {
      if (phase !== 'paused') return;
      setPhase('playing');
      speak();
    },
    next() {
      if (stepIndex + 1 < TOUR_STEPS.length) {
        if (phase === 'done') setPhase('playing');
        showStep(stepIndex + 1);
      } else {
        silence();
        if (phase !== 'done') { setPhase('done'); trackStellaTour('completed', stepId(), audioOk); }
      }
    },
    back() {
      if (phase === 'done') setPhase('playing');
      showStep(Math.max(0, stepIndex - 1));
    },
    stop() {
      silence();
      if (phase === 'playing' || phase === 'paused') trackStellaTour('stopped', stepId(), audioOk);
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
    pause: player.pause,
    resume: player.resume,
    next: player.next,
    back: player.back,
    stop: player.stop,
    talk: player.talk,
  };
}
