import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from './hooks/useNavigation';
import { useSolarConversation } from './hooks/useSolarConversation';
import { planets } from './data/planets';
import { getPlanetById } from './data/planets';
import { getMoonById, getMoonsByPlanet } from './data/moons';
import { SolarSystemScene } from './components/scene/SolarSystemScene';
import { PlanetDetail } from './components/detail/PlanetDetail';
import { MoonDetail } from './components/detail/MoonDetail';
import { SunDetail } from './components/detail/SunDetail';
import { VoiceAgent } from './components/ui/VoiceAgent';
import './App.css';

function viewTransition(update: () => void, types: string[]) {
  if (!document.startViewTransition) {
    update();
    return;
  }
  (document as any).startViewTransition({ update, types });
}

function App() {
  const { nav, goToSystem, goToSun, goToPlanet, goToMoon, goBack } = useNavigation();
  const [showLabels, setShowLabels] = useState(true);
  const [cinemaMode, setCinemaMode] = useState(false);

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
    onNavigatePlanet: handlePlanetClick,
    onNavigateMoon: (planetId, moonId) => {
      viewTransition(() => goToMoon(planetId, moonId), ['detail-open']);
    },
    onNavigateSun: handleSunClick,
    onGoBack: handleBack,
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
          <h1 className="app-title">Solar System Explorer</h1>
          <p className="app-subtitle">Click any planet to explore</p>
        </header>
      )}

      <SolarSystemScene
        planets={planets}
        moonsByPlanet={moonsByPlanet}
        nav={nav}
        onPlanetClick={handlePlanetClick}
        onMoonClick={handleSceneMoonClick}
        onSunClick={handleSunClick}
        showLabels={!cinemaMode && showLabels}
      />

      {voice.agentId && (
        <div className="app__voice-float">
          <VoiceAgent
            status={voice.status}
            isSpeaking={voice.isSpeaking}
            onToggle={voice.toggle}
            micError={voice.micError}
            onDismissError={voice.clearMicError}
          />
        </div>
      )}

      <div className="app__toolbar">
        {!cinemaMode && (
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
        )}
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

      {cinemaMode && nav.level !== 'system' && (
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

      {!cinemaMode && nav.level === 'sun' && (
        <SunDetail onClose={handleClose} />
      )}

      {!cinemaMode && nav.level === 'planet' && currentPlanet && (
        <PlanetDetail
          planet={currentPlanet}
          onClose={handleClose}
          onMoonClick={handleMoonClick}
        />
      )}

      {!cinemaMode && nav.level === 'moon' && currentPlanet && currentMoon && (
        <MoonDetail
          moon={currentMoon}
          onClose={handleClose}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

export default App;
