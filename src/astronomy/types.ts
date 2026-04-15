export type ViewMode = 'artistic' | 'orrery' | 'sky';

export interface AstronomyTime {
  /** The simulation Date currently being rendered */
  current: Date;
  /** Playback rate: 1 = real-time, 0 = paused, 3600 = 1hr/sec */
  rate: number;
  /** Jump to a specific date */
  setDate: (d: Date) => void;
  /** Change playback speed */
  setRate: (r: number) => void;
}

export interface ObserverLocation {
  /** Latitude in degrees (-90 to 90) */
  latitude: number;
  /** Longitude in degrees (-180 to 180) */
  longitude: number;
  /** Elevation in meters above sea level */
  elevation: number;
}

/** Default observer: Greenwich Observatory */
export const DEFAULT_OBSERVER: ObserverLocation = {
  latitude: 51.4769,
  longitude: -0.0005,
  elevation: 0,
};
