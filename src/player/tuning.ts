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
  maxHealth: number;
  hurtStunMs: number;
  hurtInvulnerableMs: number;
}

export const playerTuning: PlayerTuning = raw;
