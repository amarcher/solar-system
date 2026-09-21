export const RECORDING_MIME_TYPES = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
] as const;

export function supportedRecordingTypes(isSupported: (mime: string) => boolean): string[] {
  return RECORDING_MIME_TYPES.filter(mime => isSupported(mime));
}
export function recordingExtension(mime: string): 'mp4' | 'webm' {
  const container = mime.split(';', 1)[0].trim().toLowerCase();
  if (container === 'video/mp4') return 'mp4';
  if (container === 'video/webm') return 'webm';
  throw new Error(`Unsupported recording container: ${mime || 'unknown'}`);
}

/** Own one preview URL. Replace/dispose revokes it; call dispose on UI unmount. */
export class RecordingPreviewUrl {
  private current: string | null = null;
  private readonly urls: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
  constructor(urls: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'> = URL) {
    this.urls = urls;
  }
  replace(blob: Blob): string {
    this.dispose();
    this.current = this.urls.createObjectURL(blob);
    return this.current;
  }
  dispose(): void {
    if (this.current) this.urls.revokeObjectURL(this.current);
    this.current = null;
  }
}
