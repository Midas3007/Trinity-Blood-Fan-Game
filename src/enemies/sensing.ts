import type { Rect } from '../combat/types';
import type { EnemyConfig } from './enemyConfig';

/** Vision: a box in front of the enemy (plus a short range behind), limited in height. No line-of-sight walls yet. */
export function canSee(
  cfg: Pick<EnemyConfig, 'detectRange' | 'detectRear' | 'detectHeight'>,
  x: number,
  y: number,
  facing: 1 | -1,
  targetX: number,
  targetY: number,
): boolean {
  const dx = (targetX - x) * facing; // positive = in front
  if (Math.abs(targetY - y) > cfg.detectHeight) return false;
  return dx >= 0 ? dx <= cfg.detectRange : -dx <= cfg.detectRear;
}

export function pointInRects(px: number, py: number, rects: readonly Rect[]): boolean {
  return rects.some((r) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h);
}

/** True if there is floor just ahead of the enemy's leading foot. */
export function groundAheadOf(
  x: number,
  bottom: number,
  width: number,
  facing: 1 | -1,
  solids: readonly Rect[],
): boolean {
  const probeX = x + facing * (width / 2 + 2);
  return pointInRects(probeX, bottom + 2, solids);
}
