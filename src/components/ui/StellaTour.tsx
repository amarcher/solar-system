import { useEffect } from 'react';
import type { TourPhase } from '../../tour/useStellaTour';
import type { TourStep } from '../../tour/tourScript';
import './StellaTour.css';

const STAR_PATH = 'M12 1C12 1 14 8 16 10C18 12 23 12 23 12C23 12 18 12 16 14C14 16 12 23 12 23C12 23 10 16 8 14C6 12 1 12 1 12C1 12 6 12 8 10C10 8 12 1 12 1Z';

/**
 * Caption card for Stella's narrated tour of the Rubin finds. Playing it needs
 * no microphone; the last line hands off to a real conversation.
 */
export function StellaTour({ phase, step, stepIndex, total, canTalk, onStart, onPause, onResume, onBack, onNext, onStop, onTalk }: {
  phase: TourPhase;
  step: TourStep;
  stepIndex: number;
  total: number;
  /** Stella's conversation is configured and has credit. */
  canTalk: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onBack: () => void;
  onNext: () => void;
  onStop: () => void;
  onTalk: () => void;
}) {
  useEffect(() => {
    if (phase === 'idle') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onStop();
      else if (phase !== 'ready' && e.key === 'ArrowRight') onNext();
      else if (phase !== 'ready' && e.key === 'ArrowLeft') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onStop, onNext, onBack]);

  if (phase === 'idle') return null;

  const last = stepIndex === total - 1;

  return (
    <section className="stella-tour" aria-label="Tour of the Rubin finds with Stella">
      <header className="stella-tour__header">
        <svg className="stella-tour__star" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path d={STAR_PATH} />
        </svg>
        <span className="stella-tour__name">Stella</span>
        {phase !== 'ready' && (
          <>
            <span className="stella-tour__count" aria-label={`Part ${stepIndex + 1} of ${total}`}>
              {stepIndex + 1}/{total}
            </span>
            <span className="stella-tour__controls">
              <button type="button" className="stella-tour__icon-btn" onClick={onBack} disabled={stepIndex === 0} aria-label="Previous">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {phase === 'paused' ? (
                <button type="button" className="stella-tour__icon-btn" onClick={onResume} aria-label="Play">
                  <PlayIcon size={16} />
                </button>
              ) : (
                <button type="button" className="stella-tour__icon-btn" onClick={onPause} disabled={phase === 'done'} aria-label="Pause">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /></svg>
                </button>
              )}
              <button type="button" className="stella-tour__icon-btn" onClick={onNext} disabled={last} aria-label="Next">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </span>
          </>
        )}
        <button type="button" className="stella-tour__icon-btn stella-tour__close" onClick={onStop}
          aria-label={phase === 'done' || phase === 'ready' ? 'Close' : 'Stop the tour'}>
          <span aria-hidden="true">×</span>
        </button>
      </header>

      {phase === 'ready' ? (
        <>
          <p className="stella-tour__text">
            Tour the asteroids a giant new telescope just found. Turn your sound on!
          </p>
          <div className="stella-tour__actions">
            <button type="button" className="stella-tour__btn stella-tour__btn--primary" onClick={onStart}>
              <PlayIcon />
              Start the tour
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="stella-tour__text" aria-live="polite">{step.text}</p>
          {last && (
            <div className="stella-tour__actions">
              {canTalk && (
                <button type="button" className="stella-tour__btn stella-tour__btn--primary" onClick={onTalk}>
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d={STAR_PATH} fill="currentColor" /></svg>
                  Talk to Stella
                </button>
              )}
              <button type="button" className="stella-tour__btn" onClick={onStop}>Explore on my own</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function PlayIcon({ size = 14 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor" /></svg>;
}
