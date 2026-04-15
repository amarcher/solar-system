import type { Moon, NavigationState, Planet } from '../../types/celestialBody';
import type { Mission } from '../../types/mission';
import { SunMesh } from './Sun';
import { RealisticPlanet } from './RealisticPlanet';
import { RealisticStarField } from './RealisticStarField';
import { RealisticMissionTrajectory } from './RealisticMissionTrajectory';

interface RealisticSceneProps {
  planets: Planet[];
  moonsByPlanet: Record<string, Moon[]>;
  nav: NavigationState;
  onPlanetClick: (planetId: string) => void;
  onSunClick: () => void;
  showLabels: boolean;
  activeMission?: Mission;
}

export function RealisticScene({
  planets,
  nav,
  onPlanetClick,
  onSunClick,
  showLabels,
  activeMission,
}: RealisticSceneProps) {
  const isZoomedIn = nav.level === 'planet' || nav.level === 'moon' || nav.level === 'sun';
  const focusedPlanetId = (nav.level === 'planet' || nav.level === 'moon') ? nav.planetId : null;

  return (
    <>
      <RealisticStarField />
      <SunMesh onClick={onSunClick} showLabel={showLabels && !isZoomedIn} paused={false} />

      {planets.map((planet) => {
        const isFocused = focusedPlanetId === planet.id;
        return (
          <RealisticPlanet
            key={planet.id}
            planet={planet}
            onClick={() => onPlanetClick(planet.id)}
            showLabel={showLabels && (!isZoomedIn || isFocused)}
          />
        );
      })}

      {activeMission && (
        <RealisticMissionTrajectory mission={activeMission} />
      )}
    </>
  );
}
