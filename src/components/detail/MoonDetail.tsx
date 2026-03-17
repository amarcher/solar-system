import { useEffect, useRef } from 'react';
import type { Moon } from '../../types/celestialBody';
import { MoonMiniScene } from '../scene/MoonMiniScene';
import './MoonDetail.css';

interface MoonDetailProps {
  moon: Moon;
  onClose: () => void;
  onBack: () => void;
}

export function MoonDetail({ moon, onClose, onBack }: MoonDetailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onBack]);

  // Focus trap
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    container.addEventListener('keydown', handleTab);
    return () => container.removeEventListener('keydown', handleTab);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      ref={containerRef}
      className="moon-detail"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${moon.name}`}
    >
      <div className="moon-detail__bg" />

      <div className="moon-detail__header">
        <button className="moon-detail__back" onClick={onBack} type="button" aria-label="Back to planet">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back
        </button>
        <button ref={closeRef} className="detail__close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <div className="moon-detail__content">
        <MoonMiniScene moon={moon} />

        <div className="moon-detail__identity">
          <h2 className="moon-detail__name">{moon.name}</h2>
          <span className="moon-detail__notable">{moon.notableFeature}</span>
        </div>

        <p className="moon-detail__summary">{moon.summary}</p>

        <div className="moon-detail__properties">
          <div className="moon-detail__prop">
            <span className="moon-detail__prop-label">Diameter</span>
            <span className="moon-detail__prop-value">{moon.diameter.toLocaleString()} km</span>
          </div>
          <div className="moon-detail__prop">
            <span className="moon-detail__prop-label">Gravity</span>
            <span className="moon-detail__prop-value">{moon.gravity} m/s²</span>
          </div>
          <div className="moon-detail__prop">
            <span className="moon-detail__prop-label">Temperature</span>
            <span className="moon-detail__prop-value">{moon.meanTemperature}°C</span>
          </div>
          <div className="moon-detail__prop">
            <span className="moon-detail__prop-label">Orbital Period</span>
            <span className="moon-detail__prop-value">{moon.orbitalPeriod.toFixed(1)} days</span>
          </div>
        </div>

        <div className="moon-detail__facts">
          {moon.funFacts.map((fact, i) => (
            <div key={i} className="moon-detail__fact">
              <span className="moon-detail__fact-icon">
                {['\u2726', '\u26A1', '\uD83D\uDD2D'][i % 3]}
              </span>
              <span className="moon-detail__fact-text">{fact}</span>
            </div>
          ))}
        </div>

        {moon.discoveredBy && (
          <div className="moon-detail__meta">
            Discovered by {moon.discoveredBy} ({moon.yearDiscovered})
          </div>
        )}
      </div>
    </div>
  );
}
