import { describe, expect, it } from 'vitest';
import { approach, gravityFor, horizontalVelocity, jumpHeight } from '../src/player/movement';
import { PlayerTimers } from '../src/player/PlayerTimers';
import { playerTuning as t } from '../src/player/tuning';

describe('movement helpers', () => {
  it('approach never overshoots', () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(9, 10, 3)).toBe(10);
    expect(approach(0, -10, 3)).toBe(-3);
    expect(approach(-9, -10, 3)).toBe(-10);
  });

  it('uses deceleration when reversing direction', () => {
    const dt = 10;
    const accelStep = horizontalVelocity(0, 1, dt, false, t);
    const reverseStep = t.runSpeed - horizontalVelocity(t.runSpeed, -1, dt, false, t);
    expect(accelStep).toBeCloseTo((t.groundAccel * dt) / 1000);
    expect(reverseStep).toBeCloseTo((t.groundDecel * dt) / 1000);
  });

  it('air control is weaker than ground control', () => {
    expect(horizontalVelocity(0, 1, 10, true, t)).toBeLessThan(horizontalVelocity(0, 1, 10, false, t));
  });

  it('gravity is heavier when falling', () => {
    expect(gravityFor(-1, t)).toBe(t.risingGravity);
    expect(gravityFor(1, t)).toBe(t.fallingGravity);
  });

  it('tuned jump height is about two player heights', () => {
    expect(jumpHeight(t) / t.height).toBeGreaterThan(1.8);
    expect(jumpHeight(t) / t.height).toBeLessThan(2.5);
  });
});

describe('PlayerTimers', () => {
  it('buffers a jump press and allows a jump only with coyote time', () => {
    const timers = new PlayerTimers(t);
    timers.tick({ dtMs: 16, jumpPressed: true, onGround: false, velocityY: 0 });
    expect(timers.canJump).toBe(false);
    timers.tick({ dtMs: 16, jumpPressed: false, onGround: true, velocityY: 0 });
    expect(timers.canJump).toBe(true);
    timers.consumeJump();
    expect(timers.canJump).toBe(false);
  });

  it('does not refresh coyote time while moving upward on the ground (jump launch frame)', () => {
    const timers = new PlayerTimers(t);
    timers.tick({ dtMs: 16, jumpPressed: false, onGround: true, velocityY: -300 });
    expect(timers.coyote).toBe(0);
  });
});
