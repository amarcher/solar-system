import { useState, useCallback } from 'react';
import type { NavigationState } from '../types/celestialBody';
import { trackPlanetView, trackMoonView, trackSunView, trackExplorationMilestone } from '../utils/analytics';

export function useNavigation() {
  const [nav, setNav] = useState<NavigationState>({ level: 'system' });

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
