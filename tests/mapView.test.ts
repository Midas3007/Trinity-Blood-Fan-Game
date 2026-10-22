import { describe, expect, it } from 'vitest';
import { centreOn, clampView, layerTransform, MAP_ZOOM_MAX, screenToMap, zoomView } from '../src/ui/mapView';

const vp = { x: 0, y: 40, w: 480, h: 200 };

describe('map zoom and pan', () => {
  it('stays between the zoom limits and never pans the fitted map out of view', () => {
    expect(clampView({ zoom: 0.5, panX: 50, panY: 50 }, vp)).toEqual({ zoom: 1, panX: 0, panY: 0 });
    const v = clampView({ zoom: 99, panX: 1e6, panY: -1e6 }, vp);
    expect(v.zoom).toBe(MAP_ZOOM_MAX);
    expect(v.panX).toBe((480 * (MAP_ZOOM_MAX - 1)) / 2);
    expect(v.panY).toBe(-(200 * (MAP_ZOOM_MAX - 1)) / 2);
  });

  it('zooming keeps the point at the centre of the view in place', () => {
    const before = { zoom: 2, panX: 60, panY: -20 };
    const c = screenToMap(240, 140, before, vp);
    const after = zoomView(before, 1, vp);
    expect(after.zoom).toBeGreaterThan(2);
    const c2 = screenToMap(240, 140, after, vp);
    expect(c2.x).toBeCloseTo(c.x);
    expect(c2.y).toBeCloseTo(c.y);
  });

  it('a tap maps back to where the room was drawn, and centreOn brings a point to the middle', () => {
    const view = { zoom: 2, panX: 30, panY: 10 };
    const t = layerTransform(view, vp);
    expect(screenToMap(t.x + 100 * t.scale, t.y + 80 * t.scale, view, vp)).toEqual({ x: 100, y: 80 });
    const on = centreOn(200, 120, 2, vp);
    const m = screenToMap(240, 140, on, vp);
    expect(m.x).toBeCloseTo(200);
    expect(m.y).toBeCloseTo(120);
  });
});
