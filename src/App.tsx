import { useCallback, useEffect } from 'react';
import { useNavigation } from './hooks/useNavigation';
import { useSolarConversation } from './hooks/useSolarConversation';
import { planets } from './data/planets';
import { getPlanetById } from './data/planets';
import { getMoonById } from './data/moons';
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

  const handlePlanetClick = useCallback((planetId: string) => {
    viewTransition(() => goToPlanet(planetId), ['detail-open']);
  }, [goToPlanet]);

  const handleSunClick = useCallback(() => {
    viewTransition(() => goToSun(), ['detail-open']);
  }, [goToSun]);

  const handleMoonClick = useCallback((moonId: string) => {
    if (nav.level === 'planet') {
      viewTransition(() => goToMoon(nav.planetId, moonId), ['detail-open']);
    }
  }, [nav, goToMoon]);

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
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Solar System Explorer</h1>
        <p className="app-subtitle">Click any planet to explore</p>
      </header>

      <SolarSystemScene
        planets={planets}
        nav={nav}
        onPlanetClick={handlePlanetClick}
        onSunClick={handleSunClick}
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

      {nav.level === 'sun' && (
        <SunDetail onClose={handleClose} />
      )}

      {nav.level === 'planet' && currentPlanet && (
        <PlanetDetail
          planet={currentPlanet}
          onClose={handleClose}
          onMoonClick={handleMoonClick}
        />
      )}

      {nav.level === 'moon' && currentPlanet && currentMoon && (
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
