import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import type { Moon, NavigationState, Planet } from '../types/celestialBody';
import { useAstronomy } from '../astronomy/useAstronomy';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { setPlanetPosition } from '../utils/planetPositions';
import { advanceFocusSpace, createFocusSpace, focusedParent, localSystemExtent, requiredExpansion } from './focusedSpace';
import { FocusedSpaceContext } from './useFocusedSpace';

export function FocusedSpaceProvider({ nav, planets, moonsByPlanet, missionActive, children }: {
  nav: NavigationState; planets: Planet[]; moonsByPlanet: Record<string, Moon[]>; missionActive: boolean; children: ReactNode;
}) {
  const { mode } = useAstronomy();
  const reducedMotion = useReducedMotion();
  const frame = useRef(createFocusSpace());
  useLayoutEffect(() => {
    const space = frame.current;
    space.raw.clear(); space.paths.clear(); space.focusId = null;
    space.scale = 1; space.offset.set(0, 0, 0); space.clearance = 0;
  }, [mode]);
  useFrame(({ camera }, delta) => {
    const space = frame.current;
    const id = focusedParent(nav, mode, missionActive);
    const planet = planets.find(p => p.id === id);
    const extent = planet ? localSystemExtent(planet, moonsByPlanet[planet.id] ?? [], mode) : 0;
    const scale = id ? requiredExpansion(id, extent, planets, space.raw, space.paths) : 1;
    advanceFocusSpace(space, id, scale, extent, delta, reducedMotion || mode === 'sky' || missionActive || nav.level === 'mission');
    setPlanetPosition('sun', space.offset.x, space.offset.y, space.offset.z);
    if (camera instanceof PerspectiveCamera) {
      let radius = 40;
      for (const position of space.raw.values()) radius = Math.max(radius, position.length());
      const far = Math.max(600, 2 * (radius * space.scale + space.offset.length()) + 200);
      if (Math.abs(camera.far - far) > 0.5) { camera.far = far; camera.updateProjectionMatrix(); }
    }
  }, -3.5);
  // The context exposes one stable imperative frame store, never React render state.
  // eslint-disable-next-line react-hooks/refs
  return <FocusedSpaceContext.Provider value={frame.current}>{children}</FocusedSpaceContext.Provider>;
}
