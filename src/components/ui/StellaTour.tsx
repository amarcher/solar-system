import { useEffect } from 'react';
import type { TourPhase } from '../../tour/useStellaTour';
import type { TourStep } from '../../tour/tourScript';
import './StellaTour.css';

const STAR_PATH = 'M12 1C12 1 14 8 16 10C18 12 23 12 23 12C23 12 18 12 16 14C14 16 12 23 12 23C12 23 10 16 8 14C6 12 1 12 1 12C1 12 6 12 8 10C10 8 12 1 12 1Z';

/**
 * Caption card for Stella's narrated tour. Playing it needs no microphone; the
 * last line hands off to a real conversation for anyone who wants one.
 */
export function StellaTour({ phase, step, stepIndex, total, canTalk, onStart, onStop, onTalk }: {
  phase: TourPhase;
  step: TourStep;
  stepIndex: number;
  total: number;
  /** Stella's conversation is configured and has credit. */
  canTalk: boolean;
  onStart: () => void;
  onStop: () => void;
  onTalk: () => void;
}) {
  useEffect(() => {
    if (phase === 'idle') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onStop(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onStop]);

  if (phase === 'idle') return null;

  const inviting = phase === 'done' || step.id === 'invite';

  return (
    <section className="stella-tour" aria-label="Tour with Stella">
      <header className="stella-tour__header">
        <svg className="stella-tour__star" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d={STAR_PATH} />
        </svg>
        <span className="stella-tour__name">Stella</span>
        {phase !== 'ready' && (
          <span className="stella-tour__dots" aria-label={`Part ${stepIndex + 1} of ${total}`}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`stella-tour__dot${i <= stepIndex ? ' stella-tour__dot--on' : ''}`} />
            ))}
          </span>
        )}
        <button type="button" className="stella-tour__close" onClick={onStop}
          aria-label={phase === 'playing' ? 'Stop the tour' : 'Close'}>
          <span aria-hidden="true">×</span>
        </button>
      </header>

      {phase === 'ready' ? (
        <>
          <p className="stella-tour__title">Take a 1-minute tour with Stella</p>
          <p className="stella-tour__text">
            She'll fly you past Earth, Jupiter and Saturn to a mountain-sized asteroid. Turn your sound on!
          </p>
          <div className="stella-tour__actions">
            <button type="button" className="stella-tour__btn stella-tour__btn--primary" onClick={onStart}>
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor" /></svg>
              Start the tour
            </button>
            <button type="button" className="stella-tour__btn" onClick={onStop}>No thanks</button>
          </div>
        </>
      ) : (
        <>
          <p className="stella-tour__text stella-tour__caption" aria-live="polite">{step.text}</p>
          {step.target.kind === 'rubin' && (
            <p className="stella-tour__note">Artist's impression: nobody knows this asteroid's real shape yet.</p>
          )}
          {inviting && (
            <div className="stella-tour__actions">
              {canTalk && (
                <button type="button" className="stella-tour__btn stella-tour__btn--primary" onClick={onTalk}>
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d={STAR_PATH} fill="currentColor" /></svg>
                  Talk to Stella
                </button>
              )}
              <button type="button" className="stella-tour__btn" onClick={onStop}>Keep exploring</button>
            </div>
          )}
          {canTalk && inviting && (
            <p className="stella-tour__note">Talking uses your microphone. Ask a grown-up first!</p>
          )}
        </>
      )}
    </section>
  );
}
