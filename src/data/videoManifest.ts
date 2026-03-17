export interface VideoEntry {
  url: string;
  poster: string;
  description: string;
}

export const VIDEO_BASE_URL = import.meta.env.VITE_VIDEO_CDN_URL || '/videos';

export const videoManifest: Partial<Record<string, VideoEntry>> = {
  // Videos will be added as they are generated
};

export function getVideoEntry(bodyId: string): VideoEntry | undefined {
  return videoManifest[bodyId];
}
