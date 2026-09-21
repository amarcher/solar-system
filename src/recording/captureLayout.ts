/** Fit the actual XY lesson inside the composition's unobscured scene region. */
export function tidesCaptureFraming(aspect: number) {
  const span = Math.max(7 / aspect, 5.8 * 1280 / 688);
  return {
    span,
    targetX: 0.35,
    targetY: -(1 - 2 * 536 / 1280) * span / 2,
    distance: span / (2 * Math.tan(25 * Math.PI / 180)),
  };
}
