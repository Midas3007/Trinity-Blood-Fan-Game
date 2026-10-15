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
}

export const playerTuning: PlayerTuning = raw;
