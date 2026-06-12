import { useEffect, useRef } from 'react';
import type { Planet } from '../../types/celestialBody';
import type { Moon } from '../../types/celestialBody';
import { categoryColors, categoryLabels } from '../../utils/colors';
import { getMoonsByPlanet } from '../../data/moons';
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
      <button ref={closeRef} className="detail__close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>

      <div className="detail__layout">
        <div className="detail__panel detail__panel--left">
          <div className="detail__identity detail__content">
            <span className="detail__order">#{planet.orderFromSun} from the Sun</span>
            <span className="detail__name">{planet.name}</span>
            <span className="detail__category">{categoryLabels[planet.category]}</span>
          </div>

          <div className="detail__summary detail__content">
            <p>{planet.summary}</p>
          </div>

          <div className="detail__properties detail__content">
            <PropertyCard label="Diameter" value={`${planet.diameter.toLocaleString()} km`} hint={diameterHint(planet)} />
            <PropertyCard label="Mass" value={planet.mass} hint={massHint(planet)} />
            <PropertyCard label="Gravity" value={`${planet.gravity} m/s²`} hint={gravityHint(planet)} />
            <PropertyCard label="Temperature" value={`${planet.meanTemperature}°C`} />
            <PropertyCard label="Day Length" value={formatDayLength(planet.rotationPeriod)} />
            <PropertyCard label="Year Length" value={formatYearLength(planet.orbitalPeriod)} />
            <PropertyCard label="Distance" value={`${planet.distanceFromSun} AU`} hint={lightTimeHint(planet)} />
            <PropertyCard label="Axial Tilt" value={`${planet.axialTilt}°`} />
          </div>

          {planet.atmosphereComposition && (
            <div className="detail__atmosphere detail__content">
              <span className="detail__section-label">Atmosphere</span>
              <span className="detail__atmosphere-text">{planet.atmosphereComposition}</span>
            </div>
          )}
        </div>

        <div className="detail__panel detail__panel--right">
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

function PropertyCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="detail__prop-card">
      <span className="detail__prop-label">{label}</span>
      <span className="detail__prop-value">{value}</span>
      {hint && <span className="detail__prop-hint">{hint}</span>}
    </div>
  );
}

const EARTH_DIAMETER_KM = 12756;
const EARTH_GRAVITY = 9.81;
/** Light travels 1 AU in about 8.32 minutes. */
const LIGHT_MINUTES_PER_AU = 8.317;

function diameterHint(planet: Planet): string | undefined {
  if (planet.id === 'earth') return undefined;
  const ratio = planet.diameter / EARTH_DIAMETER_KM;
  if (ratio >= 1.5) return `${ratio.toFixed(ratio >= 4 ? 0 : 1)} Earths wide`;
  if (ratio >= 0.85) return 'about as wide as Earth';
  return `1/${Math.round(1 / ratio)} as wide as Earth`;
}

function massHint(planet: Planet): string | undefined {
  if (planet.id === 'earth') return undefined;
  // Derive mass ratio from surface gravity and radius: m ∝ g·r²
  const ratio =
    (planet.gravity * planet.diameter * planet.diameter) /
    (EARTH_GRAVITY * EARTH_DIAMETER_KM * EARTH_DIAMETER_KM);
  if (ratio >= 1.5) return `as heavy as ${Math.round(ratio)} Earths`;
  if (ratio >= 0.85) return 'about as heavy as Earth';
  return `1/${Math.round(1 / ratio)} of Earth's mass`;
}

function gravityHint(planet: Planet): string | undefined {
  if (planet.id === 'earth') return undefined;
  const factor = planet.gravity / EARTH_GRAVITY;
  if (factor < 0.95) return `jump ${(1 / factor).toFixed(factor < 0.2 ? 0 : 1)}× higher than on Earth!`;
  if (factor <= 1.05) return 'you would feel right at home';
  return `you would feel ${factor.toFixed(1)}× heavier`;
}

function lightTimeHint(planet: Planet): string {
  const minutes = planet.distanceFromSun * LIGHT_MINUTES_PER_AU;
  if (minutes < 90) return `sunlight takes ${Math.round(minutes)} min to get here`;
  return `sunlight takes ${(minutes / 60).toFixed(1)} hours to get here`;
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
