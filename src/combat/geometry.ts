import type { Rect, RelativeBox } from './types';

/** World-space rectangle for a relative hitbox, mirrored when facing left. */
export function worldBox(box: RelativeBox, cx: number, cy: number, facing: 1 | -1): Rect {
  const centreX = cx + facing * box.x;
  return { x: centreX - box.w / 2, y: cy + box.y - box.h / 2, w: box.w, h: box.h };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Rectangle of the given size centred on (cx, cy). */
export function centredRect(cx: number, cy: number, w: number, h: number): Rect {
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
