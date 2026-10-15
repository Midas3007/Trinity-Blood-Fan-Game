import type { State } from '../player/StateMachine';
import { approach } from '../player/movement';
import type { AttackRunner } from '../combat/AttackRunner';
import type { EnemyConfig } from './enemyConfig';
import { canSee } from './sensing';

export type EnemyStateKey = 'idle' | 'patrol' | 'alert' | 'pursue' | 'attack' | 'hurt' | 'staggered' | 'dead';

export interface EnemyTarget {
  readonly x: number;
  readonly y: number;
  readonly alive: boolean;
}

/** What enemy states can see and change. Implemented by Enemy (Phaser) and by fakes in tests. */
export interface EnemyContext {
  readonly cfg: EnemyConfig;
  readonly combat: AttackRunner;
  readonly x: number;
  readonly y: number;
  readonly homeX: number;
  readonly groundAhead: boolean;
  readonly wallAhead: boolean;
  readonly target: EnemyTarget;
  vx: number;
  facing: 1 | -1;
  /** ms until the next attack is allowed. */
  attackCooldown: number;
  /** Direction of the next patrol leg. */
  patrolDir: 1 | -1;
  /** True while a finisher holds this enemy in its stagger. */
  readonly held: boolean;
}

function seesTarget(ctx: EnemyContext): boolean {
  return ctx.target.alive && canSee(ctx.cfg, ctx.x, ctx.y, ctx.facing, ctx.target.x, ctx.target.y);
}

function faceTarget(ctx: EnemyContext): void {
  const dx = ctx.target.x - ctx.x;
  if (Math.abs(dx) > 2) ctx.facing = dx > 0 ? 1 : -1;
}

function brake(ctx: EnemyContext, dtMs: number): void {
  ctx.vx = approach(ctx.vx, 0, (ctx.cfg.brakeDecel * dtMs) / 1000);
}

const PATROL_ARRIVE_PX = 3;

/**
 * Melee walker behaviour, driven entirely by EnemyConfig data:
 * idle -> patrol -> (sees player) alert -> pursue -> attack -> pursue ...; hurt, staggered and dead can interrupt.
 * Every state has an exit by time or condition, so nothing can get stuck.
 */
export const enemyStates: Record<EnemyStateKey, State<EnemyStateKey, EnemyContext>> = {
  idle: {
    update(ctx, dtMs, stateMs) {
      brake(ctx, dtMs);
      if (seesTarget(ctx)) return 'alert';
      if (stateMs >= ctx.cfg.idleMs) return 'patrol';
      return undefined;
    },
  },

  patrol: {
    enter(ctx) {
      ctx.facing = ctx.patrolDir;
    },
    update(ctx, _dtMs, stateMs) {
      if (seesTarget(ctx)) return 'alert';
      const goal = ctx.homeX + ctx.patrolDir * ctx.cfg.patrolDistance;
      const arrived = (goal - ctx.x) * ctx.patrolDir <= PATROL_ARRIVE_PX;
      const blocked = !ctx.groundAhead || ctx.wallAhead;
      // Safety limit: a leg can never take longer than walking it twice.
      const tooLong = stateMs > ((2 * ctx.cfg.patrolDistance) / ctx.cfg.walkSpeed) * 2000;
      if (arrived || blocked || tooLong) {
        ctx.vx = 0;
        ctx.patrolDir = ctx.patrolDir === 1 ? -1 : 1;
        return 'idle';
      }
      ctx.vx = ctx.facing * ctx.cfg.walkSpeed;
      return undefined;
    },
  },

  alert: {
    enter(ctx) {
      ctx.vx = 0;
      faceTarget(ctx);
    },
    update(ctx, _dtMs, stateMs) {
      ctx.vx = 0;
      if (!ctx.target.alive) return 'idle';
      if (stateMs >= ctx.cfg.reactionMs) return 'pursue';
      return undefined;
    },
  },

  pursue: {
    update(ctx, dtMs, stateMs) {
      if (!ctx.target.alive) return 'idle';
      faceTarget(ctx);
      const dx = Math.abs(ctx.target.x - ctx.x);
      const dy = Math.abs(ctx.target.y - ctx.y);
      if (dx > ctx.cfg.loseRange || dy > ctx.cfg.detectHeight * 2) return 'idle';
      if (dx <= ctx.cfg.attackRange) {
        brake(ctx, dtMs);
        return ctx.attackCooldown === 0 ? 'attack' : undefined;
      }
      if (!ctx.groundAhead || ctx.wallAhead) {
        // Wait at the edge; give up if the player stays out of reach.
        ctx.vx = 0;
        return stateMs >= ctx.cfg.giveUpMs ? 'idle' : undefined;
      }
      ctx.vx = ctx.facing * ctx.cfg.chaseSpeed;
      return undefined;
    },
  },

  attack: {
    enter(ctx) {
      ctx.vx = 0;
      faceTarget(ctx);
      ctx.combat.begin(ctx.cfg.attack);
    },
    update(ctx, dtMs) {
      const phase = ctx.combat.tick(dtMs);
      const def = ctx.combat.current;
      const lunging = def !== null && def.stepSpeed > 0 && phase === 'active' && ctx.groundAhead && !ctx.wallAhead;
      if (lunging) ctx.vx = ctx.facing * def.stepSpeed;
      else brake(ctx, dtMs);
      if (phase === 'done') {
        ctx.attackCooldown = ctx.cfg.attackCooldownMs;
        return 'pursue';
      }
      return undefined;
    },
    exit(ctx) {
      ctx.combat.stop();
    },
  },

  hurt: {
    // Knockback velocity is set by whoever applied the hit.
    update(ctx, dtMs, stateMs) {
      brake(ctx, dtMs);
      if (stateMs >= ctx.cfg.hurtStunMs) return ctx.target.alive ? 'pursue' : 'idle';
      return undefined;
    },
  },

  staggered: {
    // Reeling and open to a finisher. Knockback is set by the hit; recovers after staggerMs unless a finisher holds it.
    enter(ctx) {
      ctx.combat.stop();
    },
    update(ctx, dtMs, stateMs) {
      brake(ctx, dtMs);
      if (!ctx.held && stateMs >= ctx.cfg.staggerMs) return ctx.target.alive ? 'pursue' : 'idle';
      return undefined;
    },
  },

  dead: {
    enter(ctx) {
      ctx.combat.stop();
    },
    update(ctx, dtMs) {
      brake(ctx, dtMs);
      return undefined;
    },
  },
};
