import type { AttackRunner } from './AttackRunner';
import { overlaps, worldBox } from './geometry';
import { hitDirection, hitFromAttack } from './hits';
import type { Damageable, HitInfo, Rect } from './types';

export interface ResolvedHit {
  target: Damageable;
  hit: HitInfo;
  /** Where to show impact effects: centre of the overlap. */
  x: number;
  y: number;
}

/** The world hitbox of the attacker's current swing, or null outside active frames. */
export function activeHitbox(runner: AttackRunner, cx: number, cy: number, facing: 1 | -1): Rect | null {
  const def = runner.current;
  if (!def || runner.phase !== 'active') return null;
  return worldBox(def.hitbox, cx, cy, facing);
}

/** Applies the attacker's active swing to every overlapping target it has not hit yet; returns the hits that landed. */
export function resolveAttack(
  runner: AttackRunner,
  attackerX: number,
  attackerY: number,
  facing: 1 | -1,
  targets: readonly Damageable[],
): ResolvedHit[] {
  const box = activeHitbox(runner, attackerX, attackerY, facing);
  const def = runner.current;
  if (!box || !def) return [];
  const out: ResolvedHit[] = [];
  for (const target of targets) {
    if (!target.alive) continue;
    const hurt = target.hurtbox();
    if (!overlaps(box, hurt) || !runner.registerHit(target.id)) continue;
    const hit = hitFromAttack(def, hitDirection(attackerX, target.x, facing));
    if (!target.receiveHit(hit)) continue;
    const x = (Math.max(box.x, hurt.x) + Math.min(box.x + box.w, hurt.x + hurt.w)) / 2;
    const y = (Math.max(box.y, hurt.y) + Math.min(box.y + box.h, hurt.y + hurt.h)) / 2;
    out.push({ target, hit, x, y });
  }
  return out;
}
