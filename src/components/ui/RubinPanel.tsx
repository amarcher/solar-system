import { useEffect, useRef, type CSSProperties } from 'react';
import { aphelionAu, RUBIN_KIND_COLORS, RUBIN_KIND_LABELS, type RubinAsteroid } from '../../data/rubinAsteroids';
import './RubinPanel.css';

interface RubinPanelProps {
  asteroids: RubinAsteroid[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}

export function RubinPanel({ asteroids, selectedId, onSelect, onClose }: RubinPanelProps) {
  const selected = asteroids.find((a) => a.id === selectedId);
  const body = useRef<HTMLDivElement>(null);

  // Each view starts at the top: a detail opened from low in the list
  // shouldn't inherit the list's scroll offset.
  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [selectedId]);

  return (
    <section className="rubin-panel" aria-label="Rubin Observatory finds">
      <header className="rubin-panel__header">
        {selected ? (
          <button type="button" className="rubin-panel__back" onClick={() => onSelect(null)}>
            <span aria-hidden="true">‹</span> All finds
          </button>
        ) : (
          <h2 className="rubin-panel__title">Rubin Observatory finds</h2>
        )}
        <button type="button" className="rubin-panel__close" aria-label="Hide Rubin finds" onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div className="rubin-panel__body" ref={body}>
        {selected ? (
          <article
            className="rubin-panel__detail"
            style={{ '--kind-color': RUBIN_KIND_COLORS[selected.kind] } as CSSProperties}
            aria-live="polite"
          >
            <p className="rubin-panel__kind">{RUBIN_KIND_LABELS[selected.kind]}</p>
            <h3 className="rubin-panel__name">{selected.name}</h3>
            <p className="rubin-panel__headline">{selected.headline}</p>
            <p className={`rubin-panel__badge${selected.rubinDiscovered ? ' rubin-panel__badge--discovered' : ''}`}>
              {selected.rubinDiscovered ? 'Discovered by Rubin' : 'Seen by Rubin'}
            </p>
            <p className="rubin-panel__blurb">{selected.blurb}</p>
            {selected.sizeLabel && <p className="rubin-panel__meta">{selected.sizeLabel}</p>}
            {aphelionAu(selected) > 50 && (
              <p className="rubin-panel__meta">
                This map squeezes big distances to fit on screen. The real path reaches far beyond what you see.
              </p>
            )}
            {selected.orbitEstimated && (
              <p className="rubin-panel__meta">
                Only watched for a short time, so this orbit is a best guess.
              </p>
            )}
          </article>
        ) : (
          <>
            <p className="rubin-panel__intro">
              Rubin's giant camera found more than 11,000 new asteroids in its first weeks of testing.
              Here are some of the most surprising things it has seen. Tap one to see its path.
            </p>
            <ul className="rubin-panel__list">
              {asteroids.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="rubin-panel__item"
                    style={{ '--kind-color': RUBIN_KIND_COLORS[a.kind] } as CSSProperties}
                    onClick={() => onSelect(a.id)}
                  >
                    <span className="rubin-panel__dot" aria-hidden="true" />
                    <span>
                      <strong>{a.headline}</strong>
                      <span>{a.name}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
