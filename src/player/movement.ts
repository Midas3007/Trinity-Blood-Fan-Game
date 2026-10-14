import type { PlayerTuning } from './tuning';

/** Moves `current` toward `target` by at most `maxDelta`. */
export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target);
  return Math.max(current - maxDelta, target);
}

/**
 * New horizontal velocity after one frame of running/air control.
 * Accelerates toward moveX * runSpeed; decelerates when there is no input
 * or when reversing direction.
 */
export function horizontalVelocity(
  vx: number,
  moveX: number,
  dtMs: number,
  inAir: boolean,
  t: PlayerTuning,
): number {
  const target = moveX * t.runSpeed;
  const speedingUp = target !== 0 && Math.sign(target) === Math.sign(vx || target) && Math.abs(target) >= Math.abs(vx);
  const rate = inAir ? (speedingUp ? t.airAccel : t.airDecel) : speedingUp ? t.groundAccel : t.groundDecel;
  return approach(vx, target, (rate * dtMs) / 1000);
}

/** Total gravity for the current vertical velocity: lighter going up, heavier coming down. */
export function gravityFor(vy: number, t: PlayerTuning): number {
  return vy < 0 ? t.risingGravity : t.fallingGravity;
}

/** Peak jump height in px from tuning (for docs and tests). */
export function jumpHeight(t: PlayerTuning): number {
  return (t.jumpVelocity * t.jumpVelocity) / (2 * t.risingGravity);
}
