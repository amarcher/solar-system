import { useCallback, useState } from 'react';
import { useAstronomy } from '../../astronomy/AstronomyContext';
import './ObserverPicker.css';

export function ObserverPicker() {
  const { observer, setObserver } = useAstronomy();
  const [expanded, setExpanded] = useState(false);

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setObserver({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          elevation: pos.coords.altitude ?? 0,
        });
      },
      () => { /* denied */ },
      { timeout: 10000 },
    );
  }, [setObserver]);

  const formatCoord = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(1)}${latDir}, ${Math.abs(lng).toFixed(1)}${lngDir}`;
  };

  return (
    <div className="observer-picker">
      <button
        className="observer-picker__toggle"
        onClick={() => setExpanded(!expanded)}
        type="button"
        title="Observer location"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="observer-picker__coords">{formatCoord(observer.latitude, observer.longitude)}</span>
      </button>

      {expanded && (
        <div className="observer-picker__panel">
          <label className="observer-picker__field">
            <span>Lat</span>
            <input
              type="number"
              min={-90}
              max={90}
              step={0.1}
              value={observer.latitude}
              onChange={(e) => setObserver({ ...observer, latitude: parseFloat(e.target.value) || 0 })}
            />
          </label>
          <label className="observer-picker__field">
            <span>Lng</span>
            <input
              type="number"
              min={-180}
              max={180}
              step={0.1}
              value={observer.longitude}
              onChange={(e) => setObserver({ ...observer, longitude: parseFloat(e.target.value) || 0 })}
            />
          </label>
          <button
            className="observer-picker__geo-btn"
            onClick={handleGeolocate}
            type="button"
          >
            Use my location
          </button>
        </div>
      )}
    </div>
  );
}
