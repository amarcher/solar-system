import { useState, useCallback, useEffect, useRef } from 'react';
import type { NavigationState } from '../types/celestialBody';
import { trackPlanetView, trackMoonView, trackSunView, trackExplorationMilestone } from '../utils/analytics';
import { navToPath, navToTitle, pathToNav } from '../utils/routes';

/**
 * Read the initial nav state from the URL. Falls back to system view on
 * the server (no `window`) or on unknown paths.
 */
function initialNavFromUrl(): NavigationState {
  if (typeof window === 'undefined') return { level: 'system' };
  return pathToNav(window.location.pathname);
}

export function useNavigation() {
  const [nav, setNav] = useState<NavigationState>(initialNavFromUrl);

  // True until we've processed the first nav → URL sync. Lets us
  // `replaceState` on the initial load (to normalize aliases like
  // /artemis → /missions/artemis-2 without adding a history entry).
  const isFirstSync = useRef(true);
  // Set when the nav change originated from a popstate event, so we
  // don't push/replace URL state in response to our own popstate handler.
  const skipNextUrlSync = useRef(false);

  // Sync URL + document title whenever nav state changes
  useEffect(() => {
    document.title = navToTitle(nav);

    if (skipNextUrlSync.current) {
      skipNextUrlSync.current = false;
      isFirstSync.current = false;
      return;
    }

    const targetPath = navToPath(nav);
    const currentPath = window.location.pathname;
    if (currentPath !== targetPath) {
      if (isFirstSync.current) {
        // Landing URL didn't match canonical — normalize in place
        window.history.replaceState({}, '', targetPath);
      } else {
        window.history.pushState({}, '', targetPath);
      }
    }
    isFirstSync.current = false;
  }, [nav]);

  // Listen for browser back/forward
  useEffect(() => {
    const handler = () => {
      skipNextUrlSync.current = true;
      setNav(pathToNav(window.location.pathname));
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const goToSystem = useCallback(() => {
    setNav({ level: 'system' });
  }, []);

  const goToSun = useCallback(() => {
    setNav({ level: 'sun' });
    trackSunView();
  }, []);

  const goToPlanet = useCallback((planetId: string) => {
    setNav({ level: 'planet', planetId });
    trackPlanetView(planetId);
    trackExplorationMilestone(planetId);
  }, []);

  const goToMoon = useCallback((planetId: string, moonId: string) => {
    setNav({ level: 'moon', planetId, moonId });
    trackMoonView(planetId, moonId);
  }, []);

  const goToMission = useCallback((missionId: string) => {
    setNav({ level: 'mission', missionId });
  }, []);

  const goBack = useCallback(() => {
    setNav((prev) => {
      switch (prev.level) {
        case 'moon':
          return { level: 'planet', planetId: prev.planetId };
        case 'planet':
        case 'sun':
        case 'mission':
          return { level: 'system' };
        default:
          return prev;
      }
    });
  }, []);

  return { nav, goToSystem, goToSun, goToPlanet, goToMoon, goToMission, goBack };
}
