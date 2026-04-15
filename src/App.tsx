import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { useNavigation } from './hooks/useNavigation';
import { useSolarConversation } from './hooks/useSolarConversation';
import { planets } from './data/planets';
import { getPlanetById } from './data/planets';
import { getMoonById, getMoonsByPlanet } from './data/moons';
import { missions, getMissionById } from './data/missions';
import { SolarSystemScene } from './components/scene/SolarSystemScene';
import { PlanetDetail } from './components/detail/PlanetDetail';
import { MoonDetail } from './components/detail/MoonDetail';
import { SunDetail } from './components/detail/SunDetail';
import { AstronomyProvider, useAstronomy } from './astronomy/AstronomyContext';
import { ModeToggle } from './components/ui/ModeToggle';
import { TimeControls } from './components/ui/TimeControls';
import { ObserverPicker } from './components/ui/ObserverPicker';
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
  const { nav, goToSystem, goToSun, goToPlanet, goToMoon, goToMission, goBack } = useNavigation();
  const { mode, setDate, setRate, setObserver } = useAstronomy();
  const [showLabels, setShowLabels] = useState(true);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [sunLayerOverride, setSunLayerOverride] = useState<number | null>(null);
  const [missionHudDismissed, setMissionHudDismissed] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const isMobile = useSyncExternalStore(subscribeToMobile, getIsMobile);
  const hideDetails = cinemaMode || isMobile;

  // Reset the mission HUD dismissed state whenever the user (re-)enters
  // mission view, so the info card shows fresh on each visit.
  useEffect(() => {
    if (nav.level !== 'mission') setMissionHudDismissed(false);
  }, [nav.level]);

  // When entering sky mode, reset to current date/time at 1x speed and
  // try geolocation so the sky matches reality out of the box.
  useEffect(() => {
    if (mode === 'sky') {
      setDate(new Date());
      setRate(1);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setObserver({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              elevation: pos.coords.altitude ?? 0,
            });
          },
          () => { /* denied — keep default */ },
          { timeout: 5000 },
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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

  const handleMissionToggle = useCallback(() => {
    if (nav.level === 'mission') {
      viewTransition(() => goToSystem(), ['detail-close']);
    } else {
      viewTransition(() => goToMission('artemis-2'), ['detail-open']);
    }
  }, [nav.level, goToSystem, goToMission]);

  const voice = useSolarConversation({
    currentNav: nav,
    onNavigatePlanet: handlePlanetClick,
    onNavigateMoon: (planetId, moonId) => {
      viewTransition(() => goToMoon(planetId, moonId), ['detail-open']);
    },
    onNavigateSun: handleSunClick,
    onTrackMission: (missionId: string) => {
      viewTransition(() => goToMission(missionId), ['detail-open']);
    },
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
  const currentMission = nav.level === 'mission'
    ? getMissionById(nav.missionId)
    : undefined;

  // Ticking clock for the mission progress HUD. Without this, the
  // "Day X of Y" counter is frozen at whatever day it was when the
  // user first entered mission view — because `currentMission` has
  // stable identity, so `useMemo([currentMission])` never recomputes.
  // Tick once per minute while in mission view (the day number only
  // changes once every 24h, so per-minute is plenty of precision).
  const [missionTick, setMissionTick] = useState(0);
  useEffect(() => {
    if (nav.level !== 'mission') return;
    const id = setInterval(() => setMissionTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [nav.level]);

  // Mission progress (for HUD card). Recomputes every `missionTick`.
  const missionProgress = useMemo(() => {
    if (!currentMission) return null;
    const launch = Date.parse(currentMission.launchDate);
    const end = Date.parse(currentMission.endDate);
    const totalDays = Math.max(1, Math.round((end - launch) / 86_400_000));
    const elapsedDays = Math.max(0, Math.min(totalDays, Math.floor((Date.now() - launch) / 86_400_000) + 1));
    const isComplete = Date.now() > end;
    return { totalDays, elapsedDays, isComplete };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- missionTick is intentional to force recompute
  }, [currentMission, missionTick]);

  return (
    <div className={`app${cinemaMode ? ' app--cinema' : ''}`}>
      {!cinemaMode && mode === 'artistic' && (
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
        missions={missions}
        nav={nav}
        onPlanetClick={handlePlanetClick}
        onMoonClick={handleSceneMoonClick}
        onSunClick={handleSunClick}
        showLabels={showLabels}
      />

      <div className={`app__toolbar${toolbarOpen ? ' app__toolbar--open' : ''}`}>
        {/* Hamburger toggle — visible only on compact screens via CSS */}
        <button
          className="app__toolbar-toggle"
          onClick={() => setToolbarOpen(v => !v)}
          type="button"
          aria-label={toolbarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={toolbarOpen}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {toolbarOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" y1="8" x2="20" y2="8" />
                <line x1="4" y1="14" x2="20" y2="14" />
              </>
            )}
          </svg>
        </button>
        <div className="app__toolbar-items">
          {voice.agentId && (
            <button
              className={`app__toolbar-btn${voice.status !== 'off' ? ' app__toolbar-btn--voice-on' : ''}`}
              onClick={() => { voice.toggle(); setToolbarOpen(false); }}
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
            onClick={() => { setShowLabels(v => !v); setToolbarOpen(false); }}
            type="button"
            aria-label={showLabels ? 'Hide labels' : 'Show labels'}
            title={showLabels ? 'Hide labels' : 'Show labels'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z" />
            </svg>
          </button>
          <button
            className={`app__toolbar-btn${nav.level === 'mission' ? ' app__toolbar-btn--mission-on' : ''}`}
            onClick={() => { handleMissionToggle(); setToolbarOpen(false); }}
            type="button"
            aria-label={nav.level === 'mission' ? 'Exit mission tracker' : 'Track Artemis II mission'}
            title={nav.level === 'mission' ? 'Exit mission tracker' : 'Track Artemis II mission'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
              <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
            </svg>
          </button>
          <button
            className={`app__toolbar-btn${cinemaMode ? ' app__toolbar-btn--active' : ''}`}
            onClick={() => { setCinemaMode(v => !v); setToolbarOpen(false); }}
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

      {!cinemaMode && (
        <a
          className="app__credits-link"
          href="https://github.com/amarcher/solar-system#credits"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Credits and attribution"
          title="Credits and attribution"
        >
          Credits
        </a>
      )}

      {nav.level !== 'system' && (hideDetails || nav.level === 'mission') && (
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
                  : nav.level === 'mission' && currentMission
                    ? currentMission.name
                    : 'Back'}
          </button>
        </div>
      )}

      {nav.level === 'mission' && currentMission && missionProgress && !missionHudDismissed && (
        <aside className="app__mission-hud" aria-label={`${currentMission.name} mission tracker`}>
          <div className="app__mission-hud-header">
            <span className="app__mission-hud-agency">NASA · LIVE</span>
            <button
              className="app__mission-hud-close"
              onClick={() => setMissionHudDismissed(true)}
              type="button"
              aria-label="Hide mission details"
            >
              ×
            </button>
          </div>
          <h2 className="app__mission-hud-title">{currentMission.name}</h2>
          <p className="app__mission-hud-progress">
            {missionProgress.isComplete
              ? `Mission complete · replaying ${missionProgress.totalDays}-day flight`
              : `Day ${missionProgress.elapsedDays} of ${missionProgress.totalDays}`}
          </p>
          <p className="app__mission-hud-summary">{currentMission.summary}</p>
          <p className="app__mission-hud-fact">
            <span className="app__mission-hud-fact-label">Did you know?</span>{' '}
            {currentMission.funFacts[0]}
          </p>
        </aside>
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

      {mode !== 'artistic' && <TimeControls />}
      {mode === 'sky' && <ObserverPicker />}
      <ModeToggle />

      <Analytics />
      <SpeedInsights />
    </div>
  );
}

function AppWithProviders() {
  return (
    <AstronomyProvider>
      <App />
    </AstronomyProvider>
  );
}

export default AppWithProviders;
