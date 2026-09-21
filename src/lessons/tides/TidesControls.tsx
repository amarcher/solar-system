import { useEffect, useRef } from 'react';
import { phaseLabel, tidesCaption, TIDES_QUALIFICATION, type TideSource, type TideStep, type TidesState } from './model';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import './TidesControls.css';
interface Props {
  state: TidesState;
  onChange: (patch: Partial<TidesState>) => void;
  onClose: () => void;
  waterMotionPaused: boolean;
  onToggleWaterMotion: () => void;
  voice?: { label: string; onClick: () => void };
}
export function TidesControls({ state, onChange, onClose, voice, waterMotionPaused, onToggleWaterMotion }: Props) {
  const dialog = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const caption = tidesCaption(state);
  useEffect(() => { close.current?.focus(); }, []);
  return (
    <section ref={dialog} className="tides-lesson" role="dialog" aria-modal="true" aria-labelledby="tides-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
        if (event.key !== 'Tab') return;
        const items = [...(dialog.current?.querySelectorAll<HTMLElement>('button, input, a[href]') ?? [])].filter((item) => item.getClientRects().length > 0);
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <header className="tides-lesson__header">
        <div><p className="tides-lesson__eyebrow">Earth · a schematic lesson</p><h2 id="tides-title">Why tides?</h2></div>
        <div>{voice && <button type="button" onClick={voice.onClick}>{voice.label}</button>}<button ref={close} type="button" onClick={onClose} aria-label="Close tides lesson">Close</button></div>
      </header>
      <div className="tides-lesson__panel">
        <div className="tides-lesson__copy" aria-live="polite" aria-atomic="true">
          <h3>{caption.title}</h3><p>{caption.explanation}</p><p className="tides-lesson__legend">{caption.legend}</p>
        </div>
        <div className="tides-lesson__settings">
          <fieldset><legend>Explore the idea</legend><div className="tides-lesson__choices">{(['gravity', 'difference', 'water'] as TideStep[]).map((step, i) => <button key={step} type="button" aria-pressed={state.step === step} onClick={() => onChange({ step })}>{i + 1}. {step === 'gravity' ? 'Gravity' : step === 'difference' ? 'Difference' : 'Water'}</button>)}</div></fieldset>
          <fieldset><legend>What is pulling?</legend><div className="tides-lesson__choices">{(['moon', 'sun', 'both'] as TideSource[]).map((source) => <button key={source} type="button" aria-pressed={state.source === source} onClick={() => onChange({ source })}>{source === 'moon' ? 'Moon' : source === 'sun' ? 'Sun' : 'Both'}</button>)}</div></fieldset>
          <fieldset><legend>{phaseLabel(state.phase)} · schematic position</legend><div className="tides-lesson__choices">{[{ phase: 0, label: 'New' }, { phase: 180, label: 'Full' }, { phase: 90, label: 'Quarter' }].map(({ phase, label }) => <button key={phase} type="button" aria-pressed={state.phase === phase} onClick={() => onChange({ phase })}>{label}</button>)}</div>
            <input aria-label="Moon angle from the Sun" aria-valuetext={phaseLabel(state.phase)} type="range" min="0" max="360" step="1" value={state.phase} onChange={(event) => onChange({ phase: Number(event.target.value) })} />
          </fieldset>
        </div>
        <footer className="tides-lesson__footer">{state.step === 'water' && (reducedMotion ? <p>Water ripples paused for reduced motion.</p> : <button type="button" onClick={onToggleWaterMotion}>{waterMotionPaused ? 'Resume water' : 'Pause water'}</button>)}<p>Sizes and distances are schematic. This is not a local tide forecast.</p><a href="https://oceanservice.noaa.gov/facts/springtide.html" target="_blank" rel="noopener noreferrer">Science: NOAA (new tab)</a><span>Images: </span><a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">Solar System Scope (new tab)</a><span> · </span><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0 (new tab)</a></footer>
      </div>
      <p className="tides-lesson__qualification">{TIDES_QUALIFICATION}</p>
    </section>
  );
}
