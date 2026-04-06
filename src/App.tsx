import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { useNavigation } from './hooks/useNavigation';
import { useSolarConversation } from './hooks/useSolarConversation';
import { planets } from './data/planets';
import { getPlanetById } from './data/planets';
import { getMoonById, getMoonsByPlanet } from './data/moons';
import { SolarSystemScene } from './components/scene/SolarSystemScene';
import { PlanetDetail } from './components/detail/PlanetDetail';
import { MoonDetail } from './components/detail/MoonDetail';
import { SunDetail } from './components/detail/SunDetail';
import './App.css';

function viewTransition(update: () => void, types: string[]) {
  if (!document.startViewTransition) {
    update();
    return;
  }
  (document as any).startViewTransition({ update, types });
}

const mobileQuery = window.matchMedia('(max-width: 899px)');
function subscribeToMobile(cb: () => void) {
  mobileQuery.addEventListener('change', cb);
  return () => mobileQuery.removeEventListener('change', cb);
}
function getIsMobile() { return mobileQuery.matches; }

function App() {
  const { nav, goToSystem, goToSun, goToPlanet, goToMoon, goBack } = useNavigation();
  const [showLabels, setShowLabels] = useState(true);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [sunLayerOverride, setSunLayerOverride] = useState<number | null>(null);
  const isMobile = useSyncExternalStore(subscribeToMobile, getIsMobile);
  const hideDetails = cinemaMode || isMobile;

  const handlePlanetClick = useCallback((planetId: string) => {
    viewTransition(() => goToPlanet(planetId), ['detail-open']);
  }, [goToPlanet]);

  const handleSunClick = useCallback(() => {
    viewTransition(() => goToSun(), ['detail-open']);
  }, [goToSun]);

  const moonsByPlanet = useMemo(() => {
    const map: Record<string, ReturnType<typeof getMoonsByPlanet>> = {};
    for (const p of planets) {
      const m = getMoonsByPlanet(p.id);
      if (m.length > 0) map[p.id] = m;
    }
    return map;
  }, []);

  const handleMoonClick = useCallback((moonId: string) => {
    if (nav.level === 'planet') {
      viewTransition(() => goToMoon(nav.planetId, moonId), ['detail-open']);
    }
  }, [nav, goToMoon]);

  const handleSceneMoonClick = useCallback((planetId: string, moonId: string) => {
    viewTransition(() => goToMoon(planetId, moonId), ['detail-open']);
  }, [goToMoon]);

  const handleClose = useCallback(() => {
    viewTransition(() => goToSystem(), ['detail-close']);
    voice.notifyNavClosed();
  }, [goToSystem]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = useCallback(() => {
    viewTransition(() => goBack(), ['detail-close']);
  }, [goBack]);

  const voice = useSolarConversation({
    currentNav: nav,
    onNavigatePlanet: handlePlanetClick,
    onNavigateMoon: (planetId, moonId) => {
      viewTransition(() => goToMoon(planetId, moonId), ['detail-open']);
    },
    onNavigateSun: handleSunClick,
    onGoBack: handleBack,
    onPeelSunLayer: (layerIndex: number) => {
      // If not already on Sun detail, navigate there first
      if (nav.level !== 'sun') {
        handleSunClick();
      }
      setSunLayerOverride(layerIndex);
    },
  });

  useEffect(() => {
    if (nav.level !== 'system') {
      voice.notifyNavChange(nav);
    }
  }, [nav]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve current planet/moon from nav state
  const currentPlanet = (nav.level === 'planet' || nav.level === 'moon')
    ? getPlanetById(nav.planetId)
    : undefined;
  const currentMoon = nav.level === 'moon'
    ? getMoonById(nav.moonId)
    : undefined;

  return (
    <div className={`app${cinemaMode ? ' app--cinema' : ''}`}>
      {!cinemaMode && (
        <header className="app-header">
          <p className="app-subtitle">
            {nav.level === 'planet' ? 'Click any moon to explore' :
             nav.level === 'moon' ? `Exploring ${currentMoon?.name ?? 'moon'}` :
             nav.level === 'sun' ? 'Exploring the Sun' :
             'Click any planet to explore'}
          </p>
        </header>
      )}

      <SolarSystemScene
        planets={planets}
        moonsByPlanet={moonsByPlanet}
        nav={nav}
        onPlanetClick={handlePlanetClick}
        onMoonClick={handleSceneMoonClick}
        onSunClick={handleSunClick}
        showLabels={showLabels}
      />

      <div className="app__toolbar">
        {voice.agentId && (
          <button
            className={`app__toolbar-btn${voice.status !== 'off' ? ' app__toolbar-btn--voice-on' : ''}`}
            onClick={voice.toggle}
            type="button"
            aria-label={voice.status === 'off' ? 'Talk to Stella' : 'Stop Stella'}
            title={voice.status === 'off' ? 'Talk to Stella' : 'Stop Stella'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill={voice.status !== 'off' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
              <path d="M12 1C12 1 14 8 16 10C18 12 23 12 23 12C23 12 18 12 16 14C14 16 12 23 12 23C12 23 10 16 8 14C6 12 1 12 1 12C1 12 6 12 8 10C10 8 12 1 12 1Z" />
            </svg>
          </button>
        )}
        <button
          className="app__toolbar-btn"
          onClick={() => setShowLabels(v => !v)}
          type="button"
          aria-label={showLabels ? 'Hide labels' : 'Show labels'}
          title={showLabels ? 'Hide labels' : 'Show labels'}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z" />
          </svg>
        </button>
        <button
          className={`app__toolbar-btn${cinemaMode ? ' app__toolbar-btn--active' : ''}`}
          onClick={() => setCinemaMode(v => !v)}
          type="button"
          aria-label={cinemaMode ? 'Exit cinema mode' : 'Cinema mode'}
          title={cinemaMode ? 'Exit cinema mode' : 'Cinema mode'}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {cinemaMode ? (
              <>
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </>
            ) : (
              <>
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </>
            )}
          </svg>
        </button>
      </div>

      {voice.micError && (
        <button
          className="app__voice-error"
          onClick={voice.clearMicError}
          type="button"
          aria-label="Dismiss microphone error"
        >
          {voice.micError === 'timeout' ? 'Microphone not responding. Try quitting audio apps, then restart your browser.' :
           voice.micError === 'not-allowed' ? 'Microphone access denied. Please allow mic access in browser settings.' :
           voice.micError === 'no-input' ? 'No audio input detected. Check your mic in System Settings.' :
           "Couldn't access your microphone. Check that one is connected."}
        </button>
      )}

      {hideDetails && nav.level !== 'system' && (
        <div className="app__cinema-nav">
          <button
            className="app__cinema-nav-btn"
            onClick={nav.level === 'moon' ? handleBack : handleClose}
            type="button"
            aria-label="Go back"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {nav.level === 'moon' && currentMoon
              ? currentMoon.name
              : nav.level === 'planet' && currentPlanet
                ? currentPlanet.name
                : nav.level === 'sun'
                  ? 'Sun'
                  : 'Back'}
          </button>
        </div>
      )}

      {!hideDetails && nav.level === 'sun' && (
        <SunDetail
          onClose={handleClose}
          onLayerChange={(layerIndex) => {
            setSunLayerOverride(null);
            voice.notifyLayerChange(layerIndex);
          }}
          activeLayerOverride={sunLayerOverride}
        />
      )}

      {!hideDetails && nav.level === 'planet' && currentPlanet && (
        <PlanetDetail
          planet={currentPlanet}
          onClose={handleClose}
          onMoonClick={handleMoonClick}
        />
      )}

      {!hideDetails && nav.level === 'moon' && currentPlanet && currentMoon && (
        <MoonDetail
          moon={currentMoon}
          onClose={handleClose}
          onBack={handleBack}
        />
      )}

      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export default App;
