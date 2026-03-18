import { Vector3 } from 'three';

/**
 * Module-level store for live planet/moon world positions.
 * PlanetOrbit/MoonOrbit write here each frame; CameraRig reads to track objects.
 */
const positions = new Map<string, Vector3>();
const moonPositions = new Map<string, Vector3>();

export function setPlanetPosition(id: string, x: number, y: number, z: number) {
  let v = positions.get(id);
  if (!v) {
    v = new Vector3();
    positions.set(id, v);
  }
  v.set(x, y, z);
}

export function getPlanetPosition(id: string): Vector3 | undefined {
  return positions.get(id);
}

export function setMoonPosition(id: string, x: number, y: number, z: number) {
  let v = moonPositions.get(id);
  if (!v) {
    v = new Vector3();
    moonPositions.set(id, v);
  }
  v.set(x, y, z);
}

export function getMoonPosition(id: string): Vector3 | undefined {
  return moonPositions.get(id);
}
