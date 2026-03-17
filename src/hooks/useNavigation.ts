import { useState, useCallback } from 'react';
import type { NavigationState } from '../types/celestialBody';

export function useNavigation() {
  const [nav, setNav] = useState<NavigationState>({ level: 'system' });

  const goToSystem = useCallback(() => {
    setNav({ level: 'system' });
  }, []);

  const goToSun = useCallback(() => {
    setNav({ level: 'sun' });
  }, []);

  const goToPlanet = useCallback((planetId: string) => {
    setNav({ level: 'planet', planetId });
  }, []);

  const goToMoon = useCallback((planetId: string, moonId: string) => {
    setNav({ level: 'moon', planetId, moonId });
  }, []);

  const goBack = useCallback(() => {
    setNav((prev) => {
      switch (prev.level) {
        case 'moon':
          return { level: 'planet', planetId: prev.planetId };
        case 'planet':
        case 'sun':
          return { level: 'system' };
        default:
          return prev;
      }
    });
  }, []);

  return { nav, goToSystem, goToSun, goToPlanet, goToMoon, goBack };
}
