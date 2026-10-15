import type { State } from './StateMachine';
import type { PlayerTimers } from './PlayerTimers';
import type { PlayerTuning } from './tuning';
import { approach, horizontalVelocity } from './movement';
import type { AttackRunner } from '../combat/AttackRunner';
import { AIR_STARTER, CROUCH_STARTER, GROUND_STARTER } from '../combat/attackData';

export type PlayerStateKey =
  | 'idle'
  | 'run'
  | 'jump'
  | 'fall'
  | 'dodge'
  | 'hardLand'
  | 'attack'
  | 'airAttack'
  | 'hurt'
  | 'crouch'
  | 'slide'
  | 'crouchAttack'
  | 'finisher';

/** Body posture for each state; the Player resizes its body to match. */
export type Posture = 'stand' | 'roll' | 'low';

export function postureFor(state: PlayerStateKey): Posture {
  if (state === 'dodge') return 'roll';
  if (state === 'crouch' || state === 'slide' || state === 'crouchAttack') return 'low';
  return 'stand';
}

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
  /** Stick/keys held down past the crouch threshold. */
  readonly crouchHeld: boolean;
  /** False when a ceiling is too low to stand up here. */
  readonly canStand: boolean;
  /** Pixels fallen since the highest point of the current airborne stretch. */
  readonly fallDistance: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  /** Set once per jump when the jump has been cut short by releasing the button. */
  jumpCut: boolean;
  /** A staggered enemy is in front of the player and in finisher range. */
  readonly finisherReady: boolean;
  /** Starts the finisher on the target found by finisherReady (faces it, holds it). */
  beginFinisher(): void;
  /** Advances the finisher (the strike lands part-way); returns true when it has finished. */
  tickFinisher(dtMs: number): boolean;
  endFinisher(): void;
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
  if (ctx.timers.canJump && ctx.canStand) return 'jump';
  if (!ctx.onGround) return 'fall';
  if (ctx.crouchHeld || !ctx.canStand) return 'crouch';
  if (ctx.attackPressed) return ctx.finisherReady ? 'finisher' : 'attack';
  if (canDodge(ctx)) return 'dodge';
  return ctx.moveX !== 0 || ctx.vx !== 0 ? 'run' : 'idle';
}

/** Where a low state goes when it ends: stay low if still crouching or under a ceiling. */
function afterLow(ctx: PlayerContext): PlayerStateKey {
  if (ctx.crouchHeld || !ctx.canStand) return 'crouch';
  return ctx.moveX !== 0 ? 'run' : 'idle';
}

function landingState(ctx: PlayerContext): PlayerStateKey {
  if (ctx.fallDistance >= ctx.tuning.hardLandingMinFall) return 'hardLand';
  if (ctx.crouchHeld) return 'crouch';
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
      if (stateMs >= ctx.tuning.dodgeDurationMs) return afterLow(ctx);
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

  crouch: {
    update(ctx, dtMs) {
      faceInput(ctx);
      // Normally you stay put while crouched; crawling is only allowed when there is no room to stand,
      // so a slide that ends under a low ceiling can never trap the player.
      const crawl = ctx.canStand ? 0 : ctx.moveX * ctx.tuning.crawlSpeed;
      ctx.vx = approach(ctx.vx, crawl, (ctx.tuning.groundDecel * dtMs) / 1000);
      if (!ctx.onGround) return 'fall';
      if (ctx.timers.canJump && ctx.canStand) return 'jump';
      if (ctx.dodgePressed && ctx.timers.dodgeCooldown === 0) return 'slide';
      if (ctx.attackPressed) return 'crouchAttack';
      if (!ctx.crouchHeld && ctx.canStand) return ctx.moveX !== 0 ? 'run' : 'idle';
      return undefined;
    },
  },

  slide: {
    enter(ctx) {
      faceInput(ctx);
      ctx.vx = ctx.facing * ctx.tuning.slideSpeed;
      ctx.timers.invulnerable = Math.max(ctx.timers.invulnerable, ctx.tuning.slideInvulnerableMs);
    },
    update(ctx, _dtMs, stateMs) {
      // Speed eases from slideSpeed down to slideEndSpeed over the slide.
      const t = Math.min(1, stateMs / ctx.tuning.slideDurationMs);
      const speed = ctx.tuning.slideSpeed + (ctx.tuning.slideEndSpeed - ctx.tuning.slideSpeed) * t;
      ctx.vx = ctx.facing * speed;
      if (!ctx.onGround) return 'fall';
      if (stateMs >= ctx.tuning.slideDurationMs) return afterLow(ctx);
      return undefined;
    },
    exit(ctx) {
      ctx.timers.dodgeCooldown = ctx.tuning.dodgeCooldownMs;
      ctx.vx = Math.sign(ctx.vx) * Math.min(Math.abs(ctx.vx), ctx.tuning.runSpeed);
    },
  },

  finisher: {
    // Locked in place and invulnerable (see Player.invulnerable) until the finisher ends.
    enter(ctx) {
      ctx.vx = 0;
      ctx.beginFinisher();
    },
    update(ctx, dtMs) {
      ctx.vx = 0;
      if (!ctx.onGround) return 'fall';
      if (ctx.tickFinisher(dtMs)) return ctx.moveX !== 0 ? 'run' : 'idle';
      return undefined;
    },
    exit(ctx) {
      ctx.endFinisher();
    },
  },

  crouchAttack: {
    enter(ctx) {
      faceInput(ctx);
      ctx.combat.begin(CROUCH_STARTER);
    },
    update(ctx, dtMs) {
      const phase = ctx.combat.tick(dtMs);
      brake(ctx, dtMs);
      if (!ctx.onGround) return 'fall';
      if (ctx.dodgePressed && ctx.combat.canDodgeCancel && ctx.timers.dodgeCooldown === 0) return 'slide';
      if (phase === 'done') return afterLow(ctx);
      return undefined;
    },
    exit(ctx) {
      ctx.combat.stop();
    },
  },
};
