import type { State } from './StateMachine';
import type { PlayerTimers } from './PlayerTimers';
import type { PlayerTuning } from './tuning';
import { horizontalVelocity } from './movement';

export type PlayerStateKey = 'idle' | 'run' | 'jump' | 'fall' | 'dodge' | 'hardLand';

/** What the player states can see and change. Implemented by Player (Phaser) and by fakes in tests. */
export interface PlayerContext {
  readonly tuning: PlayerTuning;
  readonly timers: PlayerTimers;
  readonly onGround: boolean;
  readonly moveX: number;
  readonly jumpHeld: boolean;
  readonly dodgePressed: boolean;
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

function canDodge(ctx: PlayerContext): boolean {
  return ctx.dodgePressed && ctx.onGround && ctx.timers.dodgeCooldown === 0;
}

/** Shared ground logic: falling, then jump, then dodge, then run/idle. */
function groundUpdate(ctx: PlayerContext, dtMs: number): PlayerStateKey {
  faceInput(ctx);
  ctx.vx = horizontalVelocity(ctx.vx, ctx.moveX, dtMs, false, ctx.tuning);
  if (ctx.timers.canJump) return 'jump';
  if (!ctx.onGround) return 'fall';
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
      if (ctx.vy >= 0) return 'fall';
      return undefined;
    },
  },

  fall: {
    update(ctx, dtMs) {
      airControl(ctx, dtMs);
      if (ctx.timers.canJump) return 'jump'; // coyote jump after walking off a ledge
      if (ctx.onGround) return landingState(ctx);
      return undefined;
    },
  },

  dodge: {
    enter(ctx) {
      faceInput(ctx);
      ctx.vx = ctx.facing * ctx.tuning.dodgeSpeed;
      ctx.timers.invulnerable = ctx.tuning.dodgeInvulnerableMs;
    },
    update(ctx, _dtMs, stateMs) {
      ctx.vx = ctx.facing * ctx.tuning.dodgeSpeed;
      if (!ctx.onGround) return 'fall';
      if (stateMs >= ctx.tuning.dodgeDurationMs) return ctx.moveX !== 0 ? 'run' : 'idle';
      return undefined;
    },
    exit(ctx) {
      ctx.timers.dodgeCooldown = ctx.tuning.dodgeCooldownMs;
      // Keep run speed if still holding a direction, otherwise let deceleration take over from run speed.
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
};
