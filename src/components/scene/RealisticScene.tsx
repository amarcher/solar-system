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
  onMoonClick: (planetId: string, moonId: string) => void;
  onSunClick: () => void;
  showLabels: boolean;
  activeMission?: Mission;
}

export function RealisticScene({
  planets,
  moonsByPlanet,
  nav,
  onPlanetClick,
  onMoonClick,
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
        // Hide Earth's moons when Artemis mission is active — it renders its own Moon
        const missionHidesMoons = activeMission?.frame.kind === 'planet-local'
          && activeMission.frame.planetId === planet.id;
        return (
          <RealisticPlanet
            key={planet.id}
            planet={planet}
            moons={moonsByPlanet[planet.id] || []}
            onClick={() => onPlanetClick(planet.id)}
            onMoonClick={(moonId) => onMoonClick(planet.id, moonId)}
            showLabel={showLabels && (!isZoomedIn || isFocused)}
            showMoons={isFocused && !missionHidesMoons}
            showMoonLabels={showLabels}
          />
        );
      })}

      {activeMission && (
        <RealisticMissionTrajectory mission={activeMission} />
      )}
    </>
  );
}
