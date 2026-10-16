import type { Rect } from '../combat/types';
import { TILE } from './tiled';

/** How far a building front fades while you are up on it (owner: "so I can see the platforms I can stand on"). */
export const ROOF_ALPHA = 0.45;

/**
 * True when the player is up on a painted front (on its ledges, balconies or roof) rather than walking past it at
 * street level: inside its span, feet above its bottom tile and a half and no more than three tiles over its top. Pure.
 */
export function upOnFront(front: Rect, px: number, feetY: number): boolean {
  const bottom = front.y + front.h;
  return px >= front.x - TILE / 2 && px <= front.x + front.w + TILE / 2 && feetY < bottom - TILE * 1.5 && feetY > front.y - TILE * 3;
}

/** Eases `a` toward `target` at `perS` per second. */
export function easeAlpha(a: number, target: number, perS: number, dtMs: number): number {
  const step = (perS * dtMs) / 1000;
  return a < target ? Math.min(target, a + step) : Math.max(target, a - step);
}

/** A building front also fades while an enemy inside it is this close to the player (px), so nothing attacks unseen. */
export const ENEMY_REVEAL_PX = TILE * 14;

/** Buildings (interior ids) holding an enemy within `reach` of the player. Pure. */
export function revealedInteriors(
  enemies: readonly { x: number; y: number }[],
  px: number,
  py: number,
  interiorAt: (x: number, y: number) => number,
  reach = ENEMY_REVEAL_PX,
): Set<number> {
  const out = new Set<number>();
  for (const e of enemies) {
    if (Math.abs(e.x - px) > reach || Math.abs(e.y - py) > reach) continue;
    const id = interiorAt(e.x, e.y);
    if (id >= 0) out.add(id);
  }
  return out;
}
