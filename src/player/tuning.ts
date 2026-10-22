import raw from '../data/player.json';

/** Player movement tuning (see src/data/player.json for units and notes). */
export interface PlayerTuning {
  width: number;
  height: number;
  runSpeed: number;
  groundAccel: number;
  groundDecel: number;
  airAccel: number;
  airDecel: number;
  jumpVelocity: number;
  risingGravity: number;
  fallingGravity: number;
  jumpCutMultiplier: number;
  maxFallSpeed: number;
  coyoteMs: number;
  jumpBufferMs: number;
  hardLandingMinFall: number;
  hardLandingLockMs: number;
  dodgeSpeed: number;
  dodgeDurationMs: number;
  dodgeInvulnerableMs: number;
  dodgeCooldownMs: number;
  /** Body height while rolling (DODGE). */
  rollHeight: number;
  /** Body height while crouching or sliding. */
  lowHeight: number;
  /** Stick pushed down beyond this (0-1) means crouch. */
  crouchStickThreshold: number;
  /** Movement allowed while crouched only when there is no room to stand up. */
  crawlSpeed: number;
  /** Ladder climbing speed (px/s). */
  climbSpeed: number;
  /** Cheat flight: upward speed of each wing beat (JUMP in the air), px/s. */
  flyFlapVelocity: number;
  /** Crusnik ABIL: a second tap within this long is a double tap (chain lash); one tap changes back (ms). */
  doubleTapMs: number;
  /** Phase-step (DODGE in the air, once unlocked): speed (px/s) and how long it lasts and protects (ms). */
  airDashSpeed: number;
  airDashMs: number;
  /** Ledge grab: how far above/below the head a ledge top is caught, the gap allowed to the wall (px). */
  ledgeReachAbove: number;
  ledgeReachBelow: number;
  ledgeReachGap: number;
  /** Hanging: how far the head sits above the ledge top (px). */
  ledgeHeadAbove: number;
  /** Still holding toward the ledge after this long pulls up on its own; the pull-up takes ledgePullMs;
   * after letting go, no new grab for ledgeRegrabMs (ms). */
  ledgeAutoPullMs: number;
  ledgePullMs: number;
  ledgeRegrabMs: number;
  /** Holy water flasks: how many, health each restores, how long drinking takes and when the health arrives (ms). */
  flasks: number;
  flaskHeal: number;
  drinkMs: number;
  drinkHealAtMs: number;
  /** Highest ledge walked up automatically, e.g. a stair step (px). */
  stepUpMax: number;
  slideSpeed: number;
  slideEndSpeed: number;
  slideDurationMs: number;
  slideInvulnerableMs: number;
  maxHealth: number;
  hurtStunMs: number;
  hurtInvulnerableMs: number;
  /** PARRY: how long it catches a hit, how long Abel is stuck if nothing comes, and the safety after a success (ms). */
  parryWindowMs: number;
  parryRecoveryMs: number;
  parrySuccessInvulnerableMs: number;
}

export const playerTuning: PlayerTuning = raw;
