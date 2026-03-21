import { useEffect, useRef, useState } from 'react';
import { sun } from '../../data/sun';
import './SunDetail.css';

interface SunDetailProps {
  onClose: () => void;
  onLayerChange?: (layerIndex: number) => void;
  activeLayerOverride?: number | null;
}

export function SunDetail({ onClose, onLayerChange, activeLayerOverride }: SunDetailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [activeLayer, setActiveLayer] = useState(0);

  // Allow voice agent to control the active layer
  useEffect(() => {
    if (activeLayerOverride != null && activeLayerOverride !== activeLayer) {
      setActiveLayer(activeLayerOverride);
    }
  }, [activeLayerOverride]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLayerClick = (i: number) => {
    setActiveLayer(i);
    onLayerChange?.(i);
  };

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

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

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      ref={containerRef}
      className="sun-detail"
      role="dialog"
      aria-modal="true"
      aria-label="Details for the Sun"
    >
      <div className="sun-detail__bg" />

      <button ref={closeRef} className="detail__close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>

      <div className="sun-detail__layout">
        <div className="sun-detail__col-left">
          <div className="sun-detail__identity sun-detail__content">
            <h1 className="sun-detail__name">The Sun</h1>
            <span className="sun-detail__type">{sun.spectralType} Main-Sequence Star</span>
          </div>

          <p className="sun-detail__summary sun-detail__content">{sun.summary}</p>

          {/* Interactive layers */}
          <div className="sun-detail__layers sun-detail__content">
            <span className="sun-detail__section-label">Peel back the layers</span>

            <div className="sun-detail__layer-viz">
              {sun.layers.map((layer, i) => {
                const size = 100 - i * 14;
                const isActive = i === activeLayer;
                return (
                  <button
                    key={layer.name}
                    className={`sun-detail__layer-ring ${isActive ? 'sun-detail__layer-ring--active' : ''}`}
                    style={{
                      width: `${size}%`,
                      height: `${size}%`,
                      backgroundColor: layer.color,
                      opacity: i < activeLayer ? 0.15 : 1,
                      zIndex: i + 1,
                    }}
                    onClick={() => handleLayerClick(i)}
                    aria-label={`${layer.name} layer`}
                    type="button"
                  />
                );
              })}
            </div>

            <div className="sun-detail__layer-info">
              <span className="sun-detail__layer-name" style={{ color: sun.layers[activeLayer].color }}>
                {sun.layers[activeLayer].name}
              </span>
              <span className="sun-detail__layer-temp">{sun.layers[activeLayer].temperature}</span>
              <p className="sun-detail__layer-desc">{sun.layers[activeLayer].description}</p>
            </div>
          </div>

          <div className="sun-detail__properties sun-detail__content">
            <div className="sun-detail__prop">
              <span className="sun-detail__prop-label">Diameter</span>
              <span className="sun-detail__prop-value">{sun.diameter.toLocaleString()} km</span>
            </div>
            <div className="sun-detail__prop">
              <span className="sun-detail__prop-label">Mass</span>
              <span className="sun-detail__prop-value">{sun.mass}</span>
            </div>
            <div className="sun-detail__prop">
              <span className="sun-detail__prop-label">Surface Temp</span>
              <span className="sun-detail__prop-value">{sun.surfaceTemperature.toLocaleString()}°C</span>
            </div>
            <div className="sun-detail__prop">
              <span className="sun-detail__prop-label">Core Temp</span>
              <span className="sun-detail__prop-value">{sun.coreTemperature}</span>
            </div>
            <div className="sun-detail__prop">
              <span className="sun-detail__prop-label">Age</span>
              <span className="sun-detail__prop-value">{sun.age}</span>
            </div>
            <div className="sun-detail__prop">
              <span className="sun-detail__prop-label">Luminosity</span>
              <span className="sun-detail__prop-value">{sun.luminosity}</span>
            </div>
          </div>
        </div>

        <div className="sun-detail__col-right">
          <div className="sun-detail__facts sun-detail__content">
            <span className="sun-detail__section-label">Fun Facts</span>
            {sun.funFacts.map((fact, i) => (
              <div key={i} className="sun-detail__fact">
                <span className="sun-detail__fact-icon">
                  {['\u2600\uFE0F', '\uD83D\uDD25', '\u2B50', '\uD83C\uDF1E', '\u2726', '\u26A1'][i % 6]}
                </span>
                <span className="sun-detail__fact-text">{fact}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
