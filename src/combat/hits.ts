import type { AttackDef, HitInfo } from './types';

/** Direction from attacker to target: +1 when the target is to the right. Ties use the attacker's facing. */
export function hitDirection(attackerX: number, targetX: number, facing: 1 | -1): 1 | -1 {
  if (targetX > attackerX) return 1;
  if (targetX < attackerX) return -1;
  return facing;
}

export function hitFromAttack(a: AttackDef, direction: 1 | -1): HitInfo {
  return {
    damage: a.damage,
    knockbackX: direction * a.knockbackX,
    knockbackY: a.knockbackY,
    hitstopMs: a.hitstopMs,
    shakeMs: a.shakeMs,
    shakeIntensity: a.shakeIntensity,
    ...(a.parryable === false ? { parryable: false } : {}),
  };
}
