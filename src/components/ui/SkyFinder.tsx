import { useMemo } from 'react';
import type { Planet } from '../../types/celestialBody';
import { useAstronomy } from '../../astronomy/useAstronomy';
import * as AstronomyService from '../../astronomy/AstronomyService';
import { compassPoint, skyBodyColor, sortForFinder, type SkyBody } from '../../astronomy/skyFinder';
import './SkyFinder.css';

interface SkyFinderProps {
  planets: Planet[];
  /** Turn the sky view toward this body. */
  onFind: (body: SkyBody) => void;
}

function describeHeight(altitude: number): string {
  if (altitude < 15) return 'low';
  if (altitude > 60) return 'high';
  return '';
}

/**
 * "What's up right now" — one chip per body above the horizon. Tapping a
 * chip turns the view to it, so finding a planet never depends on dragging
 * around a sky full of stars until a dot turns up.
 */
export function SkyFinder({ planets, onFind }: SkyFinderProps) {
  const { displayTime, observer, engineReady } = useAstronomy();

  const { up, down } = useMemo(() => {
    const bodies: SkyBody[] = [];
    if (engineReady) {
      const candidates = [
        { id: 'sun', name: 'Sun' },
        { id: 'moon', name: 'Moon' },
        ...planets.filter((planet) => planet.id !== 'earth').map((planet) => ({ id: planet.id, name: planet.name })),
      ];
      for (const { id, name } of candidates) {
        try {
          bodies.push({ id, name, ...AstronomyService.getHorizontalPosition(id, displayTime, observer) });
        } catch { /* skip a body the engine cannot place */ }
      }
    }
    const sorted = sortForFinder(bodies);
    return {
      up: sorted.filter((body) => body.altitude > 0),
      down: sorted.filter((body) => body.altitude <= 0 && body.id !== 'sun'),
    };
  }, [displayTime, observer, engineReady, planets]);

  if (!engineReady) return null;

  return (
    <nav className="sky-finder" aria-label="In the sky now">
      {up.length > 0 ? (
        <ul className="sky-finder__list">
          {up.map((body) => {
            const height = describeHeight(body.altitude);
            const direction = compassPoint(body.azimuth);
            return (
              <li key={body.id}>
                <button
                  type="button"
                  className="sky-finder__chip"
                  onClick={() => onFind(body)}
                  aria-label={`Find ${body.name}, ${height ? `${height} in the ` : ''}${direction}`}
                >
                  <span className="sky-finder__dot" style={{ background: skyBodyColor(body.id) }} aria-hidden />
                  <span className="sky-finder__name">{body.name}</span>
                  <span className="sky-finder__where" aria-hidden>{direction}{height ? ` · ${height}` : ''}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="sky-finder__empty">Nothing is above the horizon right now.</p>
      )}
      {down.length > 0 && (
        <p className="sky-finder__below">Below the horizon: {down.map((body) => body.name).join(', ')}</p>
      )}
    </nav>
  );
}
