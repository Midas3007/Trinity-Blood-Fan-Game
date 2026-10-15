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
  | 'finisher'
  | 'climb'
  | 'heal';

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
  /** HEAL pressed this frame, a flask is left and health is not full. */
  readonly healWanted: boolean;
  /** Drink one flask (the health is applied by the state at drinkHealAtMs). */
  drinkFlask(): void;
  /** Stick vertical (-1 up .. 1 down). */
  readonly moveY: number;
  /** A ladder overlaps the body (stick up grabs it). */
  readonly ladderHere: boolean;
  /** A ladder starts just under the feet (stick down climbs onto it). */
  readonly ladderBelow: boolean;
  /** Climbing up has brought the feet level with the floor at the ladder's top. */
  readonly atLadderTop: boolean;
  /** Turn ladder mode on (snap to the ladder, no gravity) or off. */
  setClimbing(on: boolean): void;
  /** Step off the top of the ladder onto the floor it leads to. */
  finishClimbAtTop(): void;
  /** Standing on a platform you can drop through. */
  readonly onOneway: boolean;
  /** Fall through the platform underfoot. */
  dropThrough(): void;
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

/** Stick pushed up/down far enough to grab a ladder. */
const climbUp = (ctx: PlayerContext): boolean => ctx.ladderHere && ctx.moveY <= -ctx.tuning.crouchStickThreshold;
const climbDown = (ctx: PlayerContext): boolean => ctx.ladderBelow && ctx.moveY >= ctx.tuning.crouchStickThreshold;

/** Shared ground logic, in priority order: ladder, jump, fall, attack, dodge, run/idle. */
function groundUpdate(ctx: PlayerContext, dtMs: number): PlayerStateKey {
  faceInput(ctx);
  if (climbUp(ctx) || climbDown(ctx)) {
    ctx.timers.consumeJump(); // stick up also means jump; on a ladder it means climb
    return 'climb';
  }
  ctx.vx = horizontalVelocity(ctx.vx, ctx.moveX, dtMs, false, ctx.tuning);
  if (ctx.timers.canJump && ctx.canStand) return 'jump';
  if (!ctx.onGround) return 'fall';
  if (ctx.crouchHeld || !ctx.canStand) return 'crouch';
  if (ctx.healWanted) return 'heal';
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
      if (climbUp(ctx)) return 'climb'; // grab a ladder in mid-air
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
      if (climbDown(ctx)) return 'climb';
      if (ctx.timers.canJump && ctx.onOneway) {
        // Stick down + jump on a plank floor: drop to the floor below.
        ctx.timers.consumeJump();
        ctx.dropThrough();
        return 'fall';
      }
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

  heal: {
    // Drinking holy water: stand still; the health arrives part-way through. Getting hit interrupts it (hurt).
    update(ctx, dtMs, stateMs) {
      brake(ctx, dtMs);
      if (stateMs >= ctx.tuning.drinkHealAtMs && stateMs - dtMs < ctx.tuning.drinkHealAtMs) ctx.drinkFlask();
      if (!ctx.onGround) return 'fall';
      if (stateMs >= ctx.tuning.drinkMs) return ctx.moveX !== 0 ? 'run' : 'idle';
      return undefined;
    },
  },

  climb: {
    enter(ctx) {
      ctx.setClimbing(true);
      ctx.vx = 0;
    },
    update(ctx) {
      ctx.vx = 0;
      ctx.vy = Math.abs(ctx.moveY) < 0.3 ? 0 : Math.sign(ctx.moveY) * ctx.tuning.climbSpeed;
      // JUMP lets go of the ladder; stick-up (which also counts as jump) just keeps climbing.
      if (ctx.timers.jumpBuffer > 0) {
        if (ctx.moveY > -0.3) return 'jump';
        ctx.timers.consumeJump();
      }
      if (ctx.vy < 0 && ctx.atLadderTop) {
        ctx.finishClimbAtTop();
        return 'idle';
      }
      if (!ctx.ladderHere) return ctx.onGround ? 'idle' : 'fall';
      if (ctx.onGround && ctx.vy > 0) return 'idle';
      return undefined;
    },
    exit(ctx) {
      ctx.setClimbing(false);
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
