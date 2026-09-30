import { useEffect, useRef, type CSSProperties } from 'react';
import { aphelionAu, COMPOSITION_NOTES, RUBIN_KIND_COLORS, RUBIN_KIND_LABELS, type RubinAsteroid } from '../../data/rubinAsteroids';
import './RubinPanel.css';

interface RubinPanelProps {
  asteroids: RubinAsteroid[];
  selectedId: string | null;
  view: 'follow' | 'orbit';
  onSelect: (id: string | null) => void;
  onViewChange: (view: 'follow' | 'orbit') => void;
  onClose: () => void;
  /** Start Stella's narrated tour of these finds. Omitted when the tour can't play. */
  onTour?: () => void;
}

export function RubinPanel({ asteroids, selectedId, view, onSelect, onViewChange, onClose, onTour }: RubinPanelProps) {
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
            <button
              type="button"
              className="rubin-panel__view"
              onClick={() => onViewChange(view === 'follow' ? 'orbit' : 'follow')}
            >
              {view === 'follow' ? 'See its whole orbit' : `Zoom in on ${selected.name}`}
            </button>
            <p className="rubin-panel__meta">{selected.sizeText}</p>
            <p className="rubin-panel__meta">{selected.compositionNote ?? COMPOSITION_NOTES[selected.composition]}</p>
            <p className="rubin-panel__meta">
              The 3D rock is an artist's guess. Nobody has seen its real shape, and it's drawn much bigger than life so you can find it.
            </p>
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
            {onTour && (
              <button type="button" className="rubin-panel__tour" onClick={onTour}>
                <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor" /></svg>
                Take the tour with Stella
              </button>
            )}
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
