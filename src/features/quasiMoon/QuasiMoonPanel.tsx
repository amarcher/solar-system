import { useEffect, useRef, useState } from 'react';
import { replayDate, REPLAY_DAYS, type QuasiMoonPlayback, type QuasiMoonView } from './types';
import './quasiMoon.css';

interface Props extends QuasiMoonPlayback {
  onView: (view: QuasiMoonView) => void;
  onPlay: () => void;
  onClose: () => void;
}
export default function QuasiMoonPanel({ dayRef, view, playing, onView, onPlay, onClose }: Props) {
  const [shownDay, setShownDay] = useState(0);
  const dialog = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { close.current?.focus(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setShownDay(dayRef.current), 100);
    return () => clearInterval(timer);
  }, [dayRef]);
  return <section ref={dialog} className="quasi" role="dialog" aria-modal="true" aria-labelledby="quasi-name" onKeyDown={e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
    if (e.key === 'Tab') {
      const buttons = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button, input, summary, a[href]') ?? []).filter(element => element.getClientRects().length > 0 && (element.tagName === 'SUMMARY' || !element.closest('details:not([open])')));
      if (!buttons?.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }}>
    <header className="quasi__header">
      <div><p className="quasi__eyebrow">You found Earth’s hidden companion</p><h1 id="quasi-name">Kamoʻoalewa</h1><p className="quasi__size">About 18 metres across · discovered in 2016</p></div>
      <button ref={close} className="quasi__close" onClick={onClose} aria-label="Return to Earth">×</button>
    </header>
    <div className="quasi__controls">
      <p className="quasi__explanation">{view === 'earth' ? 'Follow Earth around the Sun, and its companion traces a loop around us.' : 'Two paths, one-year rhythm. Both Earth and Kamoʻoalewa orbit the Sun.'}</p>
      <div className="quasi__views" role="group" aria-label="Orbit viewpoint">
        <button aria-pressed={view === 'sun'} onClick={() => onView('sun')}>Around the Sun</button>
        <button aria-pressed={view === 'earth'} onClick={() => onView('earth')}>Alongside Earth</button>
      </div>
      <div className="quasi__playback"><button onClick={onPlay} aria-label={playing ? 'Pause year replay' : shownDay >= REPLAY_DAYS ? 'Replay the year' : 'Play year replay'}>{playing ? 'Pause' : shownDay >= REPLAY_DAYS ? 'Replay year' : 'Play'}</button><output aria-live="off">{replayDate(shownDay)}</output></div>
      <input aria-label="Day of the one-year replay" type="range" min="0" max={REPLAY_DAYS} step="1" value={Math.floor(shownDay)} aria-valuetext={replayDate(shownDay)} onChange={e => { dayRef.current = Number(e.target.value); setShownDay(dayRef.current); }} />
      <p className="quasi__note">{view === 'earth' ? 'Earth-centered view, rotating with Earth’s solar orbit. ' : ''}JPL replay: Nov 2026–Nov 2027. Bodies enlarged.</p>
      <details><summary>Why “quasi-moon”?</summary><p>Its stretched, tilted orbit makes it loop around Earth in this moving viewpoint. It is still orbiting the Sun, not captured by Earth. This is a space diagram, not a telescope view.</p><p>Mean diameter: 18 ± 2 m, estimated from JWST thermal measurements. Discovered 27 April 2016.</p><a href="https://www.jpl.nasa.gov/news/small-asteroid-is-earths-constant-companion/" target="_blank" rel="noreferrer">NASA/JPL: the orbit</a> · <a href="https://arxiv.org/abs/2606.24017" target="_blank" rel="noreferrer">JWST: the size</a></details>
    </div>
  </section>;
}
