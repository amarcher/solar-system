export interface CameraDestination { navKey: string; mode: string }
export interface CanvasDimensions { width: number; height: number }

/** The DOM layout changes before R3F's ResizeObserver delivers its new size. */
export function cameraRestorationStep(
  saved: CameraDestination,
  current: CameraDestination,
  rendered: CanvasDimensions,
  container: CanvasDimensions | null,
): 'wait-for-layout' | 'restored' | 'new-destination' {
  if (saved.navKey !== current.navKey || saved.mode !== current.mode) return 'new-destination';
  if (!container || container.width <= 0 || container.height <= 0 ||
      Math.abs(rendered.width - container.width) > 0.5 ||
      Math.abs(rendered.height - container.height) > 0.5) return 'wait-for-layout';
  return 'restored';
}
