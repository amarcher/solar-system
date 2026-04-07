import type { Mission } from '../types/mission';
import { artemis2 } from './missions/artemis2';

export const missions: Mission[] = [artemis2];

export function getMissionById(id: string): Mission | undefined {
  return missions.find((m) => m.id === id);
}

/** Missions whose nominal window contains the given timestamp (defaults to now). */
export function getActiveMissions(at: number = Date.now()): Mission[] {
  return missions.filter((m) => {
    const start = Date.parse(m.launchDate);
    const end = Date.parse(m.endDate);
    return at >= start && at <= end;
  });
}
