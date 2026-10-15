import { describe, expect, it } from 'vitest';
import { AttackRunner, phaseAt } from '../src/combat/AttackRunner';
import { attackTable, buildAttackTable, validateAttacks, type AttackTable } from '../src/combat/attackData';
import { overlaps, worldBox } from '../src/combat/geometry';
import { Health } from '../src/combat/Health';
import { HitStop } from '../src/combat/HitStop';
import { hitDirection, hitFromAttack } from '../src/combat/hits';
import { resolveAttack } from '../src/combat/resolve';
import type { AttackDef, Damageable, HitInfo, Rect } from '../src/combat/types';
import { EventBus } from '../src/systems/EventBus';

const base: Omit<AttackDef, 'id'> = {
  startupMs: 100,
  activeMs: 50,
  recoveryMs: 100,
  damage: 5,
  knockbackX: 50,
  knockbackY: 0,
  hitstopMs: 40,
  shakeMs: 0,
  shakeIntensity: 0,
  stepSpeed: 0,
  cancelIntoDodge: true,
  hitbox: { x: 10, y: 0, w: 20, h: 10 },
};

function table(extra: Record<string, Partial<AttackDef>> = {}): AttackTable {
  const t: AttackTable = {
    a: { ...base, id: 'a', next: 'b' },
    b: { ...base, id: 'b', damage: 9 },
  };
  for (const [id, over] of Object.entries(extra)) t[id] = { ...base, id, ...over };
  return t;
}

class Target implements Damageable {
  hits: HitInfo[] = [];
  alive = true;
  constructor(
    readonly id: number,
    readonly x: number,
    private readonly box: Rect,
  ) {}
  hurtbox(): Rect {
    return this.box;
  }
  receiveHit(hit: HitInfo): boolean {
    this.hits.push(hit);
    return true;
  }
}

describe('attack data', () => {
  it('the shipped attacks validate and the combo is 3 hits with a stronger finisher', () => {
    expect(() => validateAttacks(attackTable)).not.toThrow();
    const p1 = attackTable['priest1']!;
    const p2 = attackTable[p1.next!]!;
    const p3 = attackTable[p2.next!]!;
    expect(p3.next).toBeUndefined();
    expect(p3.damage).toBeGreaterThan(p1.damage);
    expect(p3.damage).toBeGreaterThan(p2.damage);
  });

  it('rejects broken data with a clear error', () => {
    expect(() => validateAttacks(table({ c: { next: 'missing' } }))).toThrow(/does not exist/);
    expect(() => validateAttacks(table({ c: { activeMs: 0 } }))).toThrow(/activeMs/);
    expect(() => validateAttacks({ x: { ...base, id: 'x', next: 'y' }, y: { ...base, id: 'y', next: 'x' } })).toThrow(
      /loops/,
    );
    expect(() =>
      buildAttackTable({ attacks: { a: base }, groundStarter: 'a', airStarter: 'nope' }),
    ).toThrow(/starter/);
  });
});

describe('AttackRunner', () => {
  it('walks through startup, active, recovery, done', () => {
    const a = table()['a']!;
    expect(phaseAt(a, 0)).toBe('startup');
    expect(phaseAt(a, 100)).toBe('active');
    expect(phaseAt(a, 150)).toBe('recovery');
    expect(phaseAt(a, 250)).toBe('done');
  });

  it('chains into the next attack only if pressed after startup', () => {
    const r = new AttackRunner(table());
    r.begin('a');
    r.pressAttack(); // too early: ignored
    r.tick(160);
    expect(r.current?.id).toBe('a');

    const r2 = new AttackRunner(table());
    r2.begin('a');
    r2.tick(110);
    r2.pressAttack();
    r2.tick(50); // reaches recovery -> chains
    expect(r2.current?.id).toBe('b');
    expect(r2.comboStep).toBe(2);
  });

  it('hits each target once per swing, again on the next swing', () => {
    const r = new AttackRunner(table());
    r.begin('a');
    expect(r.registerHit(7)).toBe(true);
    expect(r.registerHit(7)).toBe(false);
    r.start('b');
    expect(r.registerHit(7)).toBe(true);
  });

  it('allows dodge-cancel only in recovery and only when the data says so', () => {
    const r = new AttackRunner(table({ c: { cancelIntoDodge: false } }));
    r.begin('a');
    r.tick(120);
    expect(r.canDodgeCancel).toBe(false);
    r.tick(40);
    expect(r.canDodgeCancel).toBe(true);
    r.begin('c');
    r.tick(160);
    expect(r.canDodgeCancel).toBe(false);
  });

  it('a brand-new attack works from data alone', () => {
    const t = table({ heavy: { startupMs: 300, activeMs: 100, recoveryMs: 400, damage: 40 } });
    validateAttacks(t);
    const r = new AttackRunner(t);
    r.begin('heavy');
    r.tick(310);
    expect(r.phase).toBe('active');
    expect(hitFromAttack(r.current!, -1)).toMatchObject({ damage: 40, knockbackX: -50 });
  });
});

describe('geometry and hits', () => {
  it('mirrors hitboxes when facing left', () => {
    const box = { x: 10, y: 0, w: 20, h: 10 };
    expect(worldBox(box, 100, 50, 1)).toEqual({ x: 100, y: 45, w: 20, h: 10 });
    expect(worldBox(box, 100, 50, -1)).toEqual({ x: 80, y: 45, w: 20, h: 10 });
  });

  it('detects overlap but not touching edges', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it('knocks targets away from the attacker', () => {
    expect(hitDirection(0, 10, -1)).toBe(1);
    expect(hitDirection(10, 0, 1)).toBe(-1);
    expect(hitDirection(5, 5, -1)).toBe(-1);
  });

  it('resolveAttack hits overlapping living targets only during active frames, once per swing', () => {
    const r = new AttackRunner(table());
    const near = new Target(1, 115, { x: 108, y: 40, w: 16, h: 20 });
    const far = new Target(2, 300, { x: 292, y: 40, w: 16, h: 20 });
    const dead = new Target(3, 112, { x: 104, y: 40, w: 16, h: 20 });
    dead.alive = false;
    r.begin('a');
    expect(resolveAttack(r, 100, 50, 1, [near, far, dead])).toHaveLength(0); // startup
    r.tick(110);
    const hits = resolveAttack(r, 100, 50, 1, [near, far, dead]);
    expect(hits.map((h) => h.target.id)).toEqual([1]);
    expect(near.hits[0]?.knockbackX).toBe(50);
    expect(resolveAttack(r, 100, 50, 1, [near])).toHaveLength(0);
  });
});

describe('Health, HitStop, EventBus', () => {
  it('Health clamps damage and healing', () => {
    const h = new Health(30);
    expect(h.damage(50)).toBe(30);
    expect(h.dead).toBe(true);
    h.heal(100);
    expect(h.hp).toBe(30);
  });

  it('HitStop freezes for the longest request', () => {
    const s = new HitStop();
    s.trigger(50);
    s.trigger(30);
    expect(s.tick(40)).toBe(true);
    expect(s.tick(20)).toBe(true);
    expect(s.tick(1)).toBe(false);
  });

  it('EventBus delivers typed payloads and unsubscribes', () => {
    const bus = new EventBus<{ ping: { n: number } }>();
    const got: number[] = [];
    const off = bus.on('ping', ({ n }) => got.push(n));
    bus.emit('ping', { n: 1 });
    off();
    bus.emit('ping', { n: 2 });
    expect(got).toEqual([1]);
  });
});
