import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { anchorInFront, blendViews, createView, focusScale, FOCUS_RADIUS_METERS, originForView, roomPosition, UNITS_PER_METER, type View } from './arPlacement';

describe('anchorInFront', () => {
  const placement = { distance: 1.5, drop: 0.5 };

  it('is straight ahead of the viewer and below eye level', () => {
    const anchor = anchorInFront(new Vector3(0.2, 1.6, -0.3), new Vector3(0, 0, -1), placement);
    expect(anchor.x).toBeCloseTo(0.2);
    expect(anchor.y).toBeCloseTo(1.1);
    expect(anchor.z).toBeCloseTo(-1.8);
  });

  it('follows the direction the viewer is facing', () => {
    const anchor = anchorInFront(new Vector3(0, 1.2, 0), new Vector3(1, 0, 0), placement);
    expect(anchor.x).toBeCloseTo(1.5);
    expect(anchor.z).toBeCloseTo(0);
  });

  it('ignores head pitch, so looking down does not pull it closer', () => {
    const anchor = anchorInFront(new Vector3(0, 1.6, 0), new Vector3(0, -0.8, -0.6), placement);
    expect(anchor.z).toBeCloseTo(-1.5);
    expect(anchor.y).toBeCloseTo(1.1);
  });

  it('still works when the viewer looks straight down', () => {
    const anchor = anchorInFront(new Vector3(0, 1.6, 0), new Vector3(0, -1, 0), placement);
    expect(anchor.z).toBeCloseTo(-1.5);
  });
});

describe('views', () => {
  const room: View = { scale: UNITS_PER_METER, focus: new Vector3(), anchor: new Vector3(0, 1.1, -1.4) };
  const earth = new Vector3(10, 0, 0);
  const atEarth: View = { scale: focusScale(0.32), focus: earth, anchor: new Vector3(0, 1.45, -1.6) };

  it('shows the focus at the anchor', () => {
    const origin = originForView(room);
    // The Sun, at the scene origin, lands on the anchor: origin + scale * anchor = Sun.
    expect(origin.clone().addScaledVector(room.anchor, room.scale).length()).toBeCloseTo(0);
    expect(roomPosition(room, new Vector3()).distanceTo(room.anchor)).toBeCloseTo(0);
  });

  it('makes a focused body the same size whatever its scene radius', () => {
    expect(0.32 / focusScale(0.32)).toBeCloseTo(FOCUS_RADIUS_METERS);
    expect(2 / focusScale(2)).toBeCloseTo(FOCUS_RADIUS_METERS);
  });

  it('starts and ends a flight exactly on the two views', () => {
    const start = blendViews(room, atEarth, 0, createView());
    expect(start.scale).toBeCloseTo(room.scale);
    expect(start.focus.distanceTo(room.focus)).toBeCloseTo(0);
    const end = blendViews(room, atEarth, 1, createView());
    expect(end.scale).toBeCloseTo(atEarth.scale);
    expect(end.focus.distanceTo(earth)).toBeCloseTo(0);
    expect(end.anchor.distanceTo(atEarth.anchor)).toBeCloseTo(0);
  });

  it('brings the destination steadily closer, flying in and flying back out', () => {
    const view = createView();
    for (const [from, to, target] of [[room, atEarth, earth], [atEarth, room, new Vector3()]] as const) {
      let previous = Infinity;
      for (let step = 0; step <= 20; step++) {
        blendViews(from, to, step / 20, view);
        const distance = roomPosition(view, target).distanceTo(view.anchor);
        expect(distance).toBeLessThanOrEqual(previous + 1e-9);
        previous = distance;
      }
      expect(previous).toBeCloseTo(0);
    }
  });

  it('flies between two bodies of the same size without changing scale', () => {
    const atTwin: View = { scale: atEarth.scale, focus: new Vector3(-7, 0, 3), anchor: atEarth.anchor };
    const half = blendViews(atEarth, atTwin, 0.5, createView());
    expect(half.scale).toBeCloseTo(atEarth.scale);
    expect(half.focus.x).toBeCloseTo(1.5);
  });
});
