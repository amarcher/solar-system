import { useCallback } from 'react';
import { useAstronomy } from '../../astronomy/AstronomyContext';
import './TimeControls.css';

interface TimeControlsProps {
  /** When set, shows a replay button for the mission */
  onReplayMission?: () => void;
  missionActive?: boolean;
}

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

export function TimeControls({ onReplayMission, missionActive }: TimeControlsProps = {}) {
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

        {missionActive && onReplayMission && (
          <button
            className="time-controls__replay-btn"
            onClick={onReplayMission}
            type="button"
            title="Replay Artemis II from launch"
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Replay
          </button>
        )}
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
