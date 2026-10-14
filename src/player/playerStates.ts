import type { State } from './StateMachine';
import type { PlayerTimers } from './PlayerTimers';
import type { PlayerTuning } from './tuning';
import { approach, horizontalVelocity } from './movement';
import type { AttackRunner } from '../combat/AttackRunner';
import { AIR_STARTER, GROUND_STARTER } from '../combat/attackData';

export type PlayerStateKey = 'idle' | 'run' | 'jump' | 'fall' | 'dodge' | 'hardLand' | 'attack' | 'airAttack' | 'hurt';

/** What the player states can see and change. Implemented by Player (Phaser) and by fakes in tests. */
export interface PlayerContext {
  readonly tuning: PlayerTuning;
  readonly timers: PlayerTimers;
  readonly combat: AttackRunner;
  readonly onGround: boolean;
  readonly moveX: number;
  readonly jumpHeld: boolean;
  readonly dodgePressed: boolean;
  readonly attackPressed: boolean;
  /** Pixels fallen since the highest point of the current airborne stretch. */
  readonly fallDistance: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  /** Set once per jump when the jump has been cut short by releasing the button. */
  jumpCut: boolean;
}

function faceInput(ctx: PlayerContext): void {
  if (ctx.moveX !== 0) ctx.facing = ctx.moveX > 0 ? 1 : -1;
}

function airControl(ctx: PlayerContext, dtMs: number): void {
  faceInput(ctx);
  ctx.vx = horizontalVelocity(ctx.vx, ctx.moveX, dtMs, true, ctx.tuning);
}

function brake(ctx: PlayerContext, dtMs: number): void {
  ctx.vx = approach(ctx.vx, 0, (ctx.tuning.groundDecel * dtMs) / 1000);
}

function canDodge(ctx: PlayerContext): boolean {
  return ctx.dodgePressed && ctx.onGround && ctx.timers.dodgeCooldown === 0;
}

/** Shared ground logic, in priority order: jump, fall, attack, dodge, run/idle. */
function groundUpdate(ctx: PlayerContext, dtMs: number): PlayerStateKey {
  faceInput(ctx);
  ctx.vx = horizontalVelocity(ctx.vx, ctx.moveX, dtMs, false, ctx.tuning);
  if (ctx.timers.canJump) return 'jump';
  if (!ctx.onGround) return 'fall';
  if (ctx.attackPressed) return 'attack';
  if (canDodge(ctx)) return 'dodge';
  return ctx.moveX !== 0 || ctx.vx !== 0 ? 'run' : 'idle';
}

function landingState(ctx: PlayerContext): PlayerStateKey {
  if (ctx.fallDistance >= ctx.tuning.hardLandingMinFall) return 'hardLand';
  return ctx.moveX !== 0 ? 'run' : 'idle';
}

export const playerStates: Record<PlayerStateKey, State<PlayerStateKey, PlayerContext>> = {
  idle: { update: groundUpdate },
  run: { update: groundUpdate },

  jump: {
    enter(ctx) {
      ctx.timers.consumeJump();
      ctx.vy = -ctx.tuning.jumpVelocity;
      ctx.jumpCut = false;
    },
    update(ctx, dtMs) {
      airControl(ctx, dtMs);
      // Variable height: releasing the button while rising cuts the upward speed once.
      if (!ctx.jumpHeld && !ctx.jumpCut && ctx.vy < 0) {
        ctx.vy *= ctx.tuning.jumpCutMultiplier;
        ctx.jumpCut = true;
      }
      if (ctx.attackPressed) return 'airAttack';
      if (ctx.vy >= 0) return 'fall';
      return undefined;
    },
  },

  fall: {
    update(ctx, dtMs) {
      airControl(ctx, dtMs);
      if (ctx.timers.canJump) return 'jump'; // coyote jump after walking off a ledge
      if (ctx.onGround) return landingState(ctx);
      if (ctx.attackPressed) return 'airAttack';
      return undefined;
    },
  },

  dodge: {
    enter(ctx) {
      faceInput(ctx);
      ctx.vx = ctx.facing * ctx.tuning.dodgeSpeed;
      ctx.timers.invulnerable = Math.max(ctx.timers.invulnerable, ctx.tuning.dodgeInvulnerableMs);
    },
    update(ctx, _dtMs, stateMs) {
      ctx.vx = ctx.facing * ctx.tuning.dodgeSpeed;
      if (!ctx.onGround) return 'fall';
      if (stateMs >= ctx.tuning.dodgeDurationMs) return ctx.moveX !== 0 ? 'run' : 'idle';
      return undefined;
    },
    exit(ctx) {
      ctx.timers.dodgeCooldown = ctx.tuning.dodgeCooldownMs;
      // Leave the slide at no more than run speed; normal deceleration takes over.
      ctx.vx = Math.sign(ctx.vx) * Math.min(Math.abs(ctx.vx), ctx.tuning.runSpeed);
    },
  },

  hardLand: {
    enter(ctx) {
      ctx.vx = 0;
    },
    update(ctx, _dtMs, stateMs) {
      ctx.vx = 0;
      if (stateMs >= ctx.tuning.hardLandingLockMs) return ctx.moveX !== 0 ? 'run' : 'idle';
      return undefined;
    },
  },

  attack: {
    enter(ctx) {
      faceInput(ctx);
      ctx.combat.begin(GROUND_STARTER);
    },
    update(ctx, dtMs) {
      if (ctx.attackPressed) ctx.combat.pressAttack();
      const stepBefore = ctx.combat.comboStep;
      const phase = ctx.combat.tick(dtMs);
      if (ctx.combat.comboStep !== stepBefore) faceInput(ctx); // may turn between combo swings
      const def = ctx.combat.current;

      if (!ctx.onGround) return 'fall';
      if (ctx.dodgePressed && ctx.combat.canDodgeCancel && ctx.timers.dodgeCooldown === 0) return 'dodge';
      if (def && def.stepSpeed > 0 && (phase === 'startup' || phase === 'active')) {
        ctx.vx = ctx.facing * def.stepSpeed;
      } else {
        brake(ctx, dtMs);
      }
      if (phase === 'done') return ctx.moveX !== 0 ? 'run' : 'idle';
      return undefined;
    },
    exit(ctx) {
      ctx.combat.stop();
    },
  },

  airAttack: {
    enter(ctx) {
      ctx.combat.begin(AIR_STARTER);
    },
    update(ctx, dtMs) {
      // Steering continues, but facing is locked for the swing.
      ctx.vx = horizontalVelocity(ctx.vx, ctx.moveX, dtMs, true, ctx.tuning);
      const phase = ctx.combat.tick(dtMs);
      if (ctx.onGround && ctx.vy >= 0) return landingState(ctx);
      if (phase === 'done') return 'fall';
      return undefined;
    },
    exit(ctx) {
      ctx.combat.stop();
    },
  },

  hurt: {
    // Knockback velocity is set by whoever applied the hit before entering this state.
    update(ctx, dtMs, stateMs) {
      if (ctx.onGround && ctx.vy >= 0) brake(ctx, dtMs);
      if (stateMs >= ctx.tuning.hurtStunMs) return ctx.onGround ? 'idle' : 'fall';
      return undefined;
    },
  },
};
