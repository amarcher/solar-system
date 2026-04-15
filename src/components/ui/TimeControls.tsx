import { useCallback } from 'react';
import { useAstronomy } from '../../astronomy/AstronomyContext';
import './TimeControls.css';

const SPEED_OPTIONS = [
  { label: 'Paused', rate: 0 },
  { label: '1x', rate: 1 },
  { label: '1 min/s', rate: 60 },
  { label: '1 hr/s', rate: 3600 },
  { label: '1 day/s', rate: 86400 },
  { label: '1 mo/s', rate: 86400 * 30 },
];

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function TimeControls() {
  const { displayTime, rate, setDate, setRate } = useAstronomy();

  const handleNow = useCallback(() => {
    setDate(new Date());
    setRate(1);
  }, [setDate, setRate]);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const d = new Date(e.target.value + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      setDate(d);
    }
  }, [setDate]);

  // Format for date input value
  const dateInputValue = displayTime.toISOString().slice(0, 10);

  return (
    <div className="time-controls">
      <div className="time-controls__display">
        <span className="time-controls__date">{formatDate(displayTime)}</span>
        <span className="time-controls__time">{formatTime(displayTime)} UTC</span>
      </div>

      <div className="time-controls__actions">
        <input
          type="date"
          className="time-controls__date-input"
          value={dateInputValue}
          onChange={handleDateChange}
          aria-label="Jump to date"
        />

        <button
          className="time-controls__now-btn"
          onClick={handleNow}
          type="button"
          title="Jump to now"
        >
          Now
        </button>
      </div>

      <div className="time-controls__speed" role="radiogroup" aria-label="Time speed">
        {SPEED_OPTIONS.map((opt) => (
          <button
            key={opt.rate}
            className={`time-controls__speed-btn${rate === opt.rate ? ' time-controls__speed-btn--active' : ''}`}
            onClick={() => setRate(opt.rate)}
            role="radio"
            aria-checked={rate === opt.rate}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
