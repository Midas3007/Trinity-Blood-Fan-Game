import { describe, expect, it } from 'vitest';
import { framesFor, SimPlayer } from './playerSim';
import { jumpHeight } from '../src/player/movement';
import { playerTuning as t } from '../src/player/tuning';
import { attackTable } from '../src/combat/attackData';

describe('player controller (Milestone 2)', () => {
  it('starts idle, runs when moving, returns to idle after decelerating', () => {
    const p = new SimPlayer();
    p.run(1);
    expect(p.state).toBe('idle');
    p.run(30, { moveX: 1 });
    expect(p.state).toBe('run');
    expect(p.vx).toBeCloseTo(t.runSpeed);
    p.run(30);
    expect(p.vx).toBe(0);
    expect(p.state).toBe('idle');
  });

  it('accelerates over time instead of reaching full speed instantly', () => {
    const p = new SimPlayer();
    p.step({ moveX: 1 });
    expect(p.vx).toBeGreaterThan(0);
    expect(p.vx).toBeLessThan(t.runSpeed);
  });

  it('a full jump reaches about the tuned height; a tapped jump is clearly lower (variable height)', () => {
    const full = new SimPlayer();
    full.run(60, { jump: true });
    const tap = new SimPlayer();
    tap.run(2, { jump: true });
    tap.run(60);
    expect(full.maxHeight).toBeGreaterThan(jumpHeight(t) * 0.9);
    expect(full.maxHeight).toBeLessThan(jumpHeight(t) * 1.05);
    expect(tap.maxHeight).toBeLessThan(full.maxHeight * 0.5);
  });

  it('cannot jump again in mid-air', () => {
    const p = new SimPlayer();
    p.run(10, { jump: true });
    p.run(2);
    const vyBefore = p.vy;
    p.step({ jump: true });
    expect(p.state === 'jump' && p.vy < vyBefore - 100).toBe(false);
  });

  it('falls faster than it rises', () => {
    const p = new SimPlayer();
    let up = 0;
    let down = 0;
    p.step({ jump: true });
    for (let i = 0; i < 120 && !(p.state === 'idle' && i > 2); i++) {
      if (p.vy < 0) up++;
      else if (!p.onGround) down++;
      p.step({ jump: true });
    }
    expect(down).toBeLessThan(up);
  });

  it('coyote time: jump still works shortly after walking off a ledge', () => {
    const p = new SimPlayer();
    p.ledgeX = 5;
    p.vx = t.runSpeed;
    while (p.x <= p.ledgeX) p.step({ moveX: 1 });
    p.run(framesFor(t.coyoteMs) - 2, { moveX: 1 });
    expect(p.state).toBe('fall');
    p.step({ moveX: 1, jump: true });
    expect(p.state).toBe('jump');
  });

  it('coyote time expires', () => {
    const p = new SimPlayer();
    p.ledgeX = 5;
    p.vx = t.runSpeed;
    while (p.x <= p.ledgeX) p.step({ moveX: 1 });
    p.run(framesFor(t.coyoteMs) + 2, { moveX: 1 });
    p.step({ moveX: 1, jump: true });
    expect(p.state).toBe('fall');
  });

  it('jump buffer: pressing jump just before landing jumps on landing', () => {
    const p = new SimPlayer();
    p.placeInAir(4);
    p.fsm.transition('fall');
    p.step({ jump: true }); // pressed while still airborne
    p.run(framesFor(t.jumpBufferMs) - 2, { jump: true });
    expect(p.state).toBe('jump');
  });

  it('a jump pressed too early is forgotten', () => {
    const p = new SimPlayer();
    p.placeInAir(60);
    p.fsm.transition('fall');
    p.step({ jump: true });
    p.run(120, { jump: false });
    expect(['idle', 'run']).toContain(p.state);
  });

  it('long falls cause a hard landing that locks movement, short ones do not', () => {
    const high = new SimPlayer();
    high.placeInAir(t.hardLandingMinFall + 20);
    high.fsm.transition('fall');
    high.run(120);
    // finished by now; check via a fresh run that it passed through hardLand
    const h = new SimPlayer();
    h.placeInAir(t.hardLandingMinFall + 20);
    h.fsm.transition('fall');
    let sawHard = false;
    for (let i = 0; i < 120; i++) {
      h.step({ moveX: 1 });
      if (h.state === 'hardLand') {
        sawHard = true;
        expect(h.vx).toBe(0);
      }
    }
    expect(sawHard).toBe(true);
    expect(high.state).toBe('idle');

    const low = new SimPlayer();
    low.placeInAir(t.hardLandingMinFall - 40);
    low.fsm.transition('fall');
    let sawHardLow = false;
    for (let i = 0; i < 120; i++) {
      low.step();
      if (low.state === 'hardLand') sawHardLow = true;
    }
    expect(sawHardLow).toBe(false);
  });

  it('dodge: fast, invulnerable for part of it, then cooldown', () => {
    const p = new SimPlayer();
    p.run(2);
    p.step({ dodge: true });
    expect(p.state).toBe('dodge');
    expect(p.vx).toBe(t.dodgeSpeed);
    expect(p.timers.invulnerable).toBeGreaterThan(0);
    p.run(framesFor(t.dodgeInvulnerableMs) + 1);
    expect(p.timers.invulnerable).toBe(0);
    expect(p.state).toBe('dodge');
    p.run(framesFor(t.dodgeDurationMs - t.dodgeInvulnerableMs) + 1);
    // Leaves the dodge carrying run speed, then decelerates (run -> idle).
    expect(p.state).not.toBe('dodge');
    expect(Math.abs(p.vx)).toBeLessThanOrEqual(t.runSpeed);
    expect(p.timers.dodgeCooldown).toBeGreaterThan(0);
    p.step({ dodge: true });
    expect(p.state).not.toBe('dodge');
    p.run(framesFor(t.dodgeCooldownMs) + 1);
    p.step({ dodge: true });
    expect(p.state).toBe('dodge');
  });

  it('dodge goes the way the player faces, and is ground-only', () => {
    const p = new SimPlayer();
    p.run(5, { moveX: -1 });
    p.step({ moveX: -1, dodge: true });
    expect(p.vx).toBe(-t.dodgeSpeed);

    const air = new SimPlayer();
    air.run(5, { jump: true });
    air.step({ jump: true, dodge: true });
    expect(air.state).not.toBe('dodge');
  });
});

describe('player combat states (Milestone 3)', () => {
  const p1 = attackTable['priest1']!;
  const p2 = attackTable['priest2']!;

  it('attack button on the ground starts the combo and stops running', () => {
    const p = new SimPlayer();
    p.run(20, { moveX: 1 });
    p.step({ moveX: 1, attack: true });
    expect(p.state).toBe('attack');
    p.run(framesFor(p1.startupMs + p1.activeMs), { moveX: 1 });
    expect(Math.abs(p.vx)).toBeLessThan(t.runSpeed);
  });

  it('pressing again during the swing chains to the next attack; not pressing ends the attack', () => {
    const p = new SimPlayer();
    p.step({ attack: true });
    p.run(framesFor(p1.startupMs) + 1);
    p.step({ attack: true });
    p.run(framesFor(p1.activeMs) + 1);
    expect(p.combat.current?.id).toBe('priest2');

    const q = new SimPlayer();
    q.step({ attack: true });
    q.run(framesFor(p1.startupMs + p1.activeMs + p1.recoveryMs) + 2);
    expect(q.state).toBe('idle');
    expect(p2.damage).toBeGreaterThan(0);
  });

  it('recovery can be cancelled into a dodge', () => {
    const p = new SimPlayer();
    p.step({ attack: true });
    p.run(framesFor(p1.startupMs + p1.activeMs) + 1);
    p.step({ dodge: true });
    expect(p.state).toBe('dodge');
  });

  it('attack in the air uses the air attack and ends on landing', () => {
    const p = new SimPlayer();
    p.run(5, { jump: true });
    p.step({ jump: true, attack: true });
    expect(p.state).toBe('airAttack');
    expect(p.combat.current?.id).toBe('air');
    p.run(120);
    expect(['idle', 'run']).toContain(p.state);
  });

  it('hurt state: knocked back, cannot act during stun, then recovers', () => {
    const p = new SimPlayer();
    p.run(2);
    p.vx = -150;
    p.vy = -150;
    p.fsm.transition('hurt');
    p.step({ attack: true, jump: true });
    expect(p.state).toBe('hurt');
    p.run(framesFor(t.hurtStunMs) + 30);
    expect(['idle', 'fall']).toContain(p.state);
  });
});
