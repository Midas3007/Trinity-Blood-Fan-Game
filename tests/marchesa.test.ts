import { describe, expect, it } from 'vitest';
import { MarchesaBrain, marchesaConfig as cfg, type MarchesaState } from '../src/enemies/boss/MarchesaBrain';

const DT = 1000 / 60;
const LEFT = 0;
const RIGHT = 480;

function brain(x = 400): MarchesaBrain {
  return new MarchesaBrain(x, LEFT, RIGHT);
}

/** Runs until `until` holds (or the time runs out); returns the states visited. */
function runUntil(b: MarchesaBrain, playerX: number, until: (b: MarchesaBrain) => boolean, maxMs = 20000): MarchesaState[] {
  const seen: MarchesaState[] = [];
  for (let t = 0; t < maxMs && !until(b); t += DT) {
    b.update(DT, playerX);
    if (seen[seen.length - 1] !== b.state) seen.push(b.state);
  }
  return seen;
}

describe('the Marchesa (Crisanta-style duel)', () => {
  it('hangs untouchable during the intro, then fights', () => {
    const b = brain();
    expect(b.invulnerable).toBe(true);
    expect(b.takeDamage(50)).toBe(0);
    runUntil(b, 100, (x) => x.state !== 'intro');
    expect(b.state).not.toBe('intro');
    expect(b.invulnerable).toBe(false);
  });

  it('phase 1 opens with the two-slash combo: walk in, slash, then a long lunge', () => {
    const b = brain(400);
    const states = runUntil(b, 120, (x) => x.state === 'slash2' && x.combat.phase === 'recovery');
    expect(states).toEqual(expect.arrayContaining(['walk', 'slash1', 'slash2']));
    expect(states.indexOf('slash1')).toBeLessThan(states.indexOf('slash2'));
  });

  it('the second slash lunges far (most of the lunge distance, unless a wall stops it)', () => {
    const b = brain(400);
    runUntil(b, 300, (x) => x.state === 'slash2');
    const from = b.x;
    runUntil(b, 300, (x) => x.state === 'slash2' && x.combat.phase === 'recovery');
    expect(Math.abs(b.x - from)).toBeGreaterThan(cfg.lungeDistance * 0.9);
  });

  it('the plummet: leap, hang over Abel, dive, land and send shockwaves both ways', () => {
    const b = brain(400);
    const states = runUntil(b, 200, (x) => x.state === 'impact');
    expect(states).toEqual(expect.arrayContaining(['leap', 'hang', 'dive', 'impact']));
    expect(Math.abs(b.x - 200)).toBeLessThan(2);
    expect(b.drainEvents()).toContain('landed');
    expect(b.shockwaves.map((w) => w.dir).sort()).toEqual([-1, 1]);
    const [a, c] = b.shockwaves;
    b.update(200, 200);
    expect(Math.abs(a!.x - c!.x)).toBeGreaterThan(0);
  });

  it('a parried slash makes her reel and take double damage; the dive cannot be parried', () => {
    const b = brain(400);
    runUntil(b, 380, (x) => x.state === 'slash1');
    b.parried();
    expect(b.state).toBe('staggered');
    const dealt = b.takeDamage(10);
    expect(dealt).toBe(10 * cfg.staggerDamageMultiplier);
    runUntil(b, 200, (x) => x.state === 'dive');
    b.parried();
    expect(b.state).toBe('dive');
  });

  it('at half health her strings snap; phase 2 adds the vanish and charge across the arena', () => {
    const b = brain(400);
    runUntil(b, 380, (x) => x.state === 'idle');
    b.takeDamage(Math.ceil(cfg.maxHealth * (1 - cfg.phase2At)));
    expect(b.state).toBe('strings');
    expect(b.phase).toBe(2);
    expect(b.invulnerable).toBe(true);
    const states = runUntil(b, 100, (x) => x.state === 'charge');
    expect(states).toEqual(expect.arrayContaining(['vanish', 'reappear', 'charge']));
    // reappears at the far edge from Abel (player at 100 -> right edge), charging toward him
    expect(b.x).toBeGreaterThan(RIGHT - cfg.width * 2);
    expect(b.facing).toBe(-1);
    runUntil(b, 100, (x) => x.state === 'tired');
    expect(b.x).toBeLessThan(LEFT + cfg.width * 2);
  });

  it('never gets stuck or leaves the arena, and dies when beaten', () => {
    const b = brain(240);
    let px = 240;
    let lastIdle = 0;
    let longest = 0;
    for (let t = 0; t < 120_000; t += DT) {
      if (Math.floor(t / 700) % 3 === 0) px = (Math.sin(t / 900) * 0.5 + 0.5) * RIGHT;
      b.update(DT, px);
      expect(b.x).toBeGreaterThanOrEqual(LEFT);
      expect(b.x).toBeLessThanOrEqual(RIGHT);
      if (b.state === 'idle') {
        longest = Math.max(longest, t - lastIdle);
        lastIdle = t;
      }
      if (t > 60_000 && b.alive) b.takeDamage(15);
    }
    expect(longest).toBeLessThan(8000);
    expect(b.alive).toBe(false);
    expect(b.finished).toBe(true);
  });
});
