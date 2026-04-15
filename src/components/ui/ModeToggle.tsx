import { useAstronomy } from '../../astronomy/AstronomyContext';
import type { ViewMode } from '../../astronomy/types';
import './ModeToggle.css';

const MODES: { value: ViewMode; label: string; title: string }[] = [
  { value: 'artistic', label: 'Explore', title: 'Artistic view' },
  { value: 'orrery', label: 'Orrery', title: 'Real-time orrery — accurate planetary positions' },
  { value: 'sky', label: 'Sky', title: 'Night sky — see the real sky from Earth' },
];

export function ModeToggle() {
  const { mode, setMode } = useAstronomy();

  return (
    <div className="mode-toggle" role="radiogroup" aria-label="View mode">
      {MODES.map((m) => (
        <button
          key={m.value}
          className={`mode-toggle__btn${mode === m.value ? ' mode-toggle__btn--active' : ''}`}
          onClick={() => setMode(m.value)}
          role="radio"
          aria-checked={mode === m.value}
          title={m.title}
          type="button"
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
