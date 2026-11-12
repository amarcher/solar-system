import { useEffect, useState } from 'react';
import { replayDate, replayDateInputValue, replayDayFromDate, type QuasiMoonPlayback, type QuasiMoonView } from './types';
import './quasiMoon.css';

interface Props extends QuasiMoonPlayback {
  onView: (view: QuasiMoonView) => void;
  onPlay: () => void;
  onClose: () => void;
}
export default function QuasiMoonPanel({ dayRef, view, playing, onView, onPlay, onClose }: Props) {
  const [shownDay, setShownDay] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setShownDay(dayRef.current), 100);
    return () => clearInterval(timer);
  }, [dayRef]);
  return <aside className="quasi-panel" aria-label="Kamoʻoalewa replay">
    <header><div><p className="quasi-panel__eyebrow">Earth’s hidden companion</p><h2>Kamoʻoalewa</h2></div><button onClick={onClose} aria-label="Close companion replay">×</button></header>
    <p className="quasi-panel__intro">About 18 m · discovered in 2016</p>
    <div className="quasi__views" role="group" aria-label="Companion camera">
      <button aria-pressed={view === 'sun'} onClick={() => onView('sun')}>Solar system</button>
      <button aria-pressed={view === 'earth'} onClick={() => onView('earth')}>Follow companion</button>
    </div>
    <div className="quasi__playback"><button onClick={onPlay} aria-label={playing ? 'Pause companion replay' : 'Play companion replay'}>{playing ? 'Pause' : 'Play'}</button><output aria-live="off">{replayDate(shownDay)}</output></div>
    <label className="quasi__date">Replay date<input aria-label="Replay date" type="date" min="2026-11-08" value={replayDateInputValue(shownDay)} onChange={e => { dayRef.current = replayDayFromDate(e.target.value); setShownDay(dayRef.current); }} /></label>
    <details><summary>Why “quasi-moon”?</summary><p>The gold path is its orbit around the Sun. It takes about a year, like Earth. From a viewpoint that follows Earth and turns with its solar orbit, it traces a loop around us. This Orrery shows its orbit around the Sun, and the replay keeps moving forward until you pause it.</p><p>Discovered 27 April 2016. Mean diameter: 18 ± 2 m, estimated from JWST thermal measurements.</p><a href="https://www.jpl.nasa.gov/news/small-asteroid-is-earths-constant-companion/" target="_blank" rel="noreferrer">NASA/JPL: orbit</a> · <a href="https://arxiv.org/abs/2606.24017" target="_blank" rel="noreferrer">JWST: size</a></details>
    <p className="quasi__note">Daily JPL positions cover Nov 2026–Nov 2027; a two-body orbit model continues after that. All planets share the date. Distances compressed; bodies enlarged.</p>
  </aside>;
}
