import { useEffect, useRef } from 'react';
import type { Planet } from '../../types/celestialBody';
import type { Moon } from '../../types/celestialBody';
import { categoryColors, categoryLabels } from '../../utils/colors';
import { getMoonsByPlanet } from '../../data/moons';
import { PlanetMiniScene } from '../scene/PlanetMiniScene';
import './PlanetDetail.css';

interface PlanetDetailProps {
  planet: Planet;
  onClose: () => void;
  onMoonClick: (moonId: string) => void;
}

export function PlanetDetail({ planet, onClose, onMoonClick }: PlanetDetailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus close button on mount
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Escape closes
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

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

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const catColor = categoryColors[planet.category];
  const moons: Moon[] = getMoonsByPlanet(planet.id);

  return (
    <div
      ref={containerRef}
      className="detail"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${planet.name}`}
      style={{ '--cat-color': catColor } as React.CSSProperties}
    >
      <div className="detail__bg" />

      <button ref={closeRef} className="detail__close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>

      <div className="detail__layout">
        <PlanetMiniScene planet={planet} onMoonClick={onMoonClick} />

        <div className="detail__col-left">
          <div className="detail__identity detail__content">
            <span className="detail__order">#{planet.orderFromSun} from the Sun</span>
            <span className="detail__name">{planet.name}</span>
            <span className="detail__category">{categoryLabels[planet.category]}</span>
          </div>

          <div className="detail__summary detail__content">
            <p>{planet.summary}</p>
          </div>

          <div className="detail__properties detail__content">
            <PropertyCard label="Diameter" value={`${planet.diameter.toLocaleString()} km`} />
            <PropertyCard label="Mass" value={planet.mass} />
            <PropertyCard label="Gravity" value={`${planet.gravity} m/s²`} />
            <PropertyCard label="Temperature" value={`${planet.meanTemperature}°C`} />
            <PropertyCard label="Day Length" value={formatDayLength(planet.rotationPeriod)} />
            <PropertyCard label="Year Length" value={formatYearLength(planet.orbitalPeriod)} />
            <PropertyCard label="Distance" value={`${planet.distanceFromSun} AU`} />
            <PropertyCard label="Axial Tilt" value={`${planet.axialTilt}°`} />
          </div>

          {planet.atmosphereComposition && (
            <div className="detail__atmosphere detail__content">
              <span className="detail__section-label">Atmosphere</span>
              <span className="detail__atmosphere-text">{planet.atmosphereComposition}</span>
            </div>
          )}
        </div>

        <div className="detail__col-right">
          <div className="detail__facts detail__content">
            <span className="detail__section-label">Fun Facts</span>
            {planet.funFacts.map((fact, i) => (
              <div key={i} className="detail__fact-card">
                <span className="detail__fact-icon">
                  {['\u2726', '\u26A1', '\uD83D\uDD2D', '\uD83D\uDCA1'][i % 4]}
                </span>
                <span className="detail__fact-text">{fact}</span>
              </div>
            ))}
          </div>

          {moons.length > 0 && (
            <div className="detail__moons detail__content">
              <span className="detail__section-label">
                Moons ({planet.numberOfMoons} total{moons.length < planet.numberOfMoons ? `, ${moons.length} notable` : ''})
              </span>
              <div className="detail__moon-list">
                {moons.map((moon) => (
                  <button
                    key={moon.id}
                    className="detail__moon-item"
                    onClick={() => onMoonClick(moon.id)}
                    type="button"
                  >
                    <span className="detail__moon-name">{moon.name}</span>
                    <span className="detail__moon-feature">{moon.notableFeature}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {planet.discoveredBy && (
            <div className="detail__meta detail__content">
              Discovered by {planet.discoveredBy} ({planet.yearDiscovered})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PropertyCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail__prop-card">
      <span className="detail__prop-label">{label}</span>
      <span className="detail__prop-value">{value}</span>
    </div>
  );
}

function formatDayLength(hours: number): string {
  const abs = Math.abs(hours);
  const retrograde = hours < 0 ? ' (retrograde)' : '';
  if (abs < 48) return `${abs.toFixed(1)} hours${retrograde}`;
  return `${(abs / 24).toFixed(1)} Earth days${retrograde}`;
}

function formatYearLength(days: number): string {
  if (days < 400) return `${days.toFixed(1)} Earth days`;
  return `${(days / 365.25).toFixed(1)} Earth years`;
}
