import type { PlayerTuning } from './tuning';

export interface TimerInput {
  dtMs: number;
  jumpPressed: boolean;
  onGround: boolean;
  velocityY: number;
}

/** Forgiveness and cooldown timers, all in ms counting down to 0. Pure, so it can be unit tested. */
export class PlayerTimers {
  /** >0 while a jump may still start after leaving the ground. */
  coyote = 0;
  /** >0 while a recent jump press is waiting to be used. */
  jumpBuffer = 0;
  dodgeCooldown = 0;
  /** >0 while the player cannot be hurt. */
  invulnerable = 0;

  constructor(private readonly t: PlayerTuning) {}

  tick(input: TimerInput): void {
    const d = input.dtMs;
    this.coyote = Math.max(0, this.coyote - d);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - d);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - d);
    this.invulnerable = Math.max(0, this.invulnerable - d);
    if (input.jumpPressed) this.jumpBuffer = this.t.jumpBufferMs;
    // Only refresh coyote time when standing, not on the frame a jump has just launched.
    if (input.onGround && input.velocityY >= 0) this.coyote = this.t.coyoteMs;
  }

  get canJump(): boolean {
    return this.coyote > 0 && this.jumpBuffer > 0;
  }

  consumeJump(): void {
    this.coyote = 0;
    this.jumpBuffer = 0;
  }
}
