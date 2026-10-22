/** Zoom and pan of the map overlay, kept free of Phaser so it can be unit tested. */

export const MAP_ZOOM_MIN = 1;
export const MAP_ZOOM_MAX = 4;
/** Each zoom step multiplies the scale by this much. */
export const MAP_ZOOM_STEP = 1.5;

export interface MapView {
  zoom: number;
  panX: number;
  panY: number;
}

/** The map's drawing area on screen (the map is drawn to fit it at zoom 1). */
export interface MapViewport {
  x: number;
  y: number;
  w: number;
  h: number;
}

const centre = (v: MapViewport): { cx: number; cy: number } => ({ cx: v.x + v.w / 2, cy: v.y + v.h / 2 });

/** Keeps the zoom in range and the pan within reach of the map's edges (the fitted map never leaves the view). */
export function clampView(view: MapView, vp: MapViewport): MapView {
  const zoom = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, view.zoom));
  const maxX = (vp.w * (zoom - 1)) / 2;
  const maxY = (vp.h * (zoom - 1)) / 2;
  return { zoom, panX: Math.min(maxX, Math.max(-maxX, view.panX)), panY: Math.min(maxY, Math.max(-maxY, view.panY)) };
}

/** Zooms by `steps` (positive = in) about the centre of the view, keeping the point there in place. */
export function zoomView(view: MapView, steps: number, vp: MapViewport): MapView {
  const zoom = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, view.zoom * MAP_ZOOM_STEP ** steps));
  const k = zoom / view.zoom;
  return clampView({ zoom, panX: view.panX * k, panY: view.panY * k }, vp);
}

/** The layer's transform: a point p drawn at zoom 1 appears at centre + (p - centre) * zoom + pan. */
export function layerTransform(view: MapView, vp: MapViewport): { x: number; y: number; scale: number } {
  const { cx, cy } = centre(vp);
  return { x: cx * (1 - view.zoom) + view.panX, y: cy * (1 - view.zoom) + view.panY, scale: view.zoom };
}

/** Screen point -> the map's zoom-1 drawing coordinates (for taps). */
export function screenToMap(sx: number, sy: number, view: MapView, vp: MapViewport): { x: number; y: number } {
  const t = layerTransform(view, vp);
  return { x: (sx - t.x) / t.scale, y: (sy - t.y) / t.scale };
}

/** The pan that puts a zoom-1 map point at the centre of the view (to open zoomed in on Abel). */
export function centreOn(px: number, py: number, zoom: number, vp: MapViewport): MapView {
  const { cx, cy } = centre(vp);
  return clampView({ zoom, panX: (cx - px) * zoom, panY: (cy - py) * zoom }, vp);
}
