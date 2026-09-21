import { useEffect, useRef } from 'react';
import { TidesRecordingControls } from '../../recording/TidesRecordingControls';
import type { TidesRecordingUi } from '../../recording/useTidesRecording';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { tidesCaption, TIDES_QUALIFICATION, type TideSource, type TideStep, type TidesState } from './model';
import './InlineTidesControls.css';

interface Props {
  state: TidesState;
  recording: TidesRecordingUi;
  onChange: (patch: Partial<TidesState>) => void;
  onClose: () => void;
  waterMotionPaused: boolean;
  onToggleWaterMotion: () => void;
}

/** Small nonmodal controls: the scene, camera, clock and toolbar remain usable. */
export function InlineTidesControls({ recording, state, onChange, onClose, waterMotionPaused, onToggleWaterMotion }: Props) {
  const recordButton = useRef<HTMLButtonElement>(null);
  const previousCaptureActive = useRef(recording.active);
  useEffect(() => {
    if (previousCaptureActive.current && !recording.active) recordButton.current?.focus();
    previousCaptureActive.current = recording.active;
  }, [recording.active]);
  const summary = useRef<HTMLElement>(null);
  useEffect(() => { summary.current?.focus({ preventScroll: true }); }, []);
  const reducedMotion = useReducedMotion();
  const caption = tidesCaption(state);
  return <aside className={`inline-tides${recording.active ? ' inline-tides--recording' : ''}`} aria-label="Earth tides controls" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (recording.active) recording.cancel(); else onClose(); }
  }}>
    <details className="inline-tides__details" hidden={recording.active}>
      <summary ref={summary}><span>Earth’s tides</span><span className="inline-tides__hint">Controls</span></summary>
      <div className="inline-tides__body">
        <p className="inline-tides__copy">{caption.explanation}</p>
        <fieldset><legend>Show</legend><div className="inline-tides__choices">
          {(['water', 'gravity', 'difference'] as TideStep[]).map(step => <button key={step} type="button" aria-pressed={state.step === step} onClick={() => onChange({ step })}>{step === 'water' ? 'Water' : step === 'gravity' ? 'Gravity' : 'Difference'}</button>)}
        </div></fieldset>
        <fieldset><legend>Pull from</legend><div className="inline-tides__choices">
          {(['moon', 'sun', 'both'] as TideSource[]).map(source => <button key={source} type="button" aria-pressed={state.source === source} onClick={() => onChange({ source })}>{source === 'moon' ? 'Moon' : source === 'sun' ? 'Sun' : 'Both'}</button>)}
        </div></fieldset>
        <p className="inline-tides__legend">{caption.legend}</p>
        <p className="inline-tides__legend">Follows the Moon and Sun in this view. Pan, zoom, or use the time controls to explore.</p>
        {state.step === 'water' && (reducedMotion ? <p className="inline-tides__legend">Ripples paused for reduced motion.</p> : <button type="button" onClick={onToggleWaterMotion}>{waterMotionPaused ? 'Resume water' : 'Pause water'}</button>)}
        <a href="https://oceanservice.noaa.gov/facts/springtide.html" target="_blank" rel="noopener noreferrer">How tides work · NOAA</a>
        <button type="button" onClick={onClose}>Hide tides</button>
        {!recording.active && <TidesRecordingControls recording={recording} recordButtonRef={recordButton} />}
      </div>
    </details>
    {recording.active && <TidesRecordingControls recording={recording} recordButtonRef={recordButton} />}
    <p hidden={recording.active} className="inline-tides__qualification">{TIDES_QUALIFICATION}</p>
  </aside>;
}
