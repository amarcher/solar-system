import { Vector3 } from 'three';

/**
 * Module-level store for live spacecraft world positions.
 * MissionTrajectory writes here each frame; CameraRig reads to fly to / track
 * the spacecraft. Mirrors the pattern in `planetPositions.ts`.
 */
const positions = new Map<string, Vector3>();

export function setMissionPosition(id: string, x: number, y: number, z: number) {
  let v = positions.get(id);
  if (!v) {
    v = new Vector3();
    positions.set(id, v);
  }
  v.set(x, y, z);
}

export function getMissionPosition(id: string): Vector3 | undefined {
  return positions.get(id);
}

export function clearMissionPosition(id: string) {
  positions.delete(id);
}
