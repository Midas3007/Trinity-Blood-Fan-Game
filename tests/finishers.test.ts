import { describe, expect, it } from 'vitest';
import { buildFinisherTable, chooseFinisher, finisherTable, type FinisherTarget } from '../src/combat/finisherData';
import { FinisherRunner } from '../src/combat/FinisherRunner';
import { StrengthBuff } from '../src/combat/StrengthBuff';
import { AttackRunner } from '../src/combat/AttackRunner';
import { resolveAttack } from '../src/combat/resolve';
import { attackTable } from '../src/combat/attackData';
import type { Damageable, HitInfo } from '../src/combat/types';
import { enemyConfig } from '../src/enemies/enemyConfig';
import { DT as EDT, SimEnemy } from './enemySim';
import { DT, SimPlayer } from './playerSim';
import raw from '../src/data/finishers.json';

class FakeTarget implements FinisherTarget {
  id = 7;
  alive = true;
  staggered = true;
  drainable = false;
  held = false;
  finishedBy: (1 | -1) | null = null;
  constructor(public x = 20, public y = 0) {}
  hold(on: boolean): void {
    this.held = on;
  }
  finish(direction: 1 | -1): void {
    this.finishedBy = direction;
    this.alive = false;
  }
}

describe('finisher choice', () => {
  const revolver = finisherTable.revolver!;

  it('priest Abel shoots a staggered enemy in front of him and in range', () => {
    expect(chooseFinisher('priest', 0, 0, 1, new FakeTarget(20))?.id).toBe('revolver');
    expect(chooseFinisher('priest', 0, 0, 1, new FakeTarget(revolver.range + 1))).toBeNull();
  });

  it('needs the enemy staggered, alive, in front, and on the same level', () => {
    const t = new FakeTarget(20);
    t.staggered = false;
    expect(chooseFinisher('priest', 0, 0, 1, t)).toBeNull();
    expect(chooseFinisher('priest', 0, 0, -1, new FakeTarget(20))).toBeNull(); // behind
    expect(chooseFinisher('priest', 0, 0, 1, new FakeTarget(20, -40))).toBeNull(); // on a ledge above
    const dead = new FakeTarget(20);
    dead.alive = false;
    expect(chooseFinisher('priest', 0, 0, 1, dead)).toBeNull();
  });

  it('Crusnik Abel drains only Methuselah (drainable) and does not use the gun', () => {
    const human = new FakeTarget(10);
    expect(chooseFinisher('crusnik', 0, 0, 1, human)).toBeNull();
    const methuselah = new FakeTarget(10);
    methuselah.drainable = true;
    expect(chooseFinisher('crusnik', 0, 0, 1, methuselah)?.id).toBe('bloodDrain');
    expect(chooseFinisher('priest', 0, 0, 1, methuselah)?.id).toBe('revolver');
  });

  it('rejects bad finisher data', () => {
    const bad = structuredClone(raw) as typeof raw;
    bad.finishers.revolver.strikeAtMs = bad.finishers.revolver.durationMs;
    expect(() => buildFinisherTable(bad)).toThrow(/strikeAtMs/);
  });
});

describe('FinisherRunner', () => {
  it('holds the target, strikes exactly once at strikeAtMs, then ends at durationMs', () => {
    const def = finisherTable.revolver!;
    const t = new FakeTarget();
    const r = new FinisherRunner();
    r.begin(def, t);
    expect(t.held).toBe(true);
    let strikes = 0;
    let at = -1;
    for (let ms = 0; !r.done; ms += DT) {
      if (r.tick(DT, 1)) {
        strikes++;
        at = ms + DT;
      }
    }
    expect(strikes).toBe(1);
    expect(Math.abs(at - def.strikeAtMs)).toBeLessThanOrEqual(DT);
    expect(t.finishedBy).toBe(1);
    expect(t.held).toBe(false);
  });

  it('stopping early releases the target without killing it', () => {
    const t = new FakeTarget();
    const r = new FinisherRunner();
    r.begin(finisherTable.revolver!, t);
    r.tick(100, 1);
    r.stop();
    expect(t.held).toBe(false);
    expect(t.alive).toBe(true);
  });
});

describe('blood-drain strength', () => {
  it('multiplies outgoing damage until it runs out', () => {
    const buff = new StrengthBuff();
    const drain = finisherTable.bloodDrain!;
    buff.apply(drain.buff!.damageMultiplier, drain.buff!.durationMs);
    const hits: HitInfo[] = [];
    const target: Damageable = { id: 1, alive: true, x: 10, hurtbox: () => ({ x: 0, y: -20, w: 40, h: 40 }), receiveHit: (h) => (hits.push(h), true) };
    const runner = new AttackRunner(attackTable);
    runner.begin('priest1');
    while (runner.phase !== 'active') runner.tick(DT);
    resolveAttack(runner, 0, 0, 1, [target], buff.damageMultiplier);
    expect(hits[0]!.damage).toBe(Math.round(attackTable.priest1!.damage * drain.buff!.damageMultiplier));
    buff.tick(drain.buff!.durationMs);
    expect(buff.damageMultiplier).toBe(1);
  });

  it('draining again refreshes the timer instead of stacking the multiplier', () => {
    const buff = new StrengthBuff();
    buff.apply(1.5, 1000);
    buff.tick(600);
    buff.apply(1.5, 1000);
    expect(buff.damageMultiplier).toBe(1.5);
    expect(buff.remaining).toBe(1000);
  });
});

describe('enemy stagger', () => {
  const cfg = enemyConfig('thrall');

  it('a staggered enemy recovers after staggerMs, but not while a finisher holds it', () => {
    const e = new SimEnemy(cfg);
    e.fsm.transition('staggered');
    e.held = true;
    for (let t = 0; t < cfg.staggerMs + 500; t += EDT) e.step();
    expect(e.state).toBe('staggered');
    e.held = false;
    e.step();
    expect(e.state).not.toBe('staggered');
  });

  it('two combo hits put a thrall at or below its stagger threshold; the full combo still kills', () => {
    const afterTwo = cfg.maxHealth - attackTable.priest1!.damage - attackTable.priest2!.damage;
    expect(afterTwo).toBeGreaterThan(0);
    expect(afterTwo / cfg.maxHealth).toBeLessThanOrEqual(cfg.staggerBelowFraction);
    expect(afterTwo - attackTable.priest3!.damage).toBeLessThanOrEqual(0);
  });
});

describe('player finisher state', () => {
  it('ATK next to a staggered enemy plays the finisher instead of a combo, invulnerable-length lock, then returns to idle', () => {
    const p = new SimPlayer();
    p.run(5);
    const t = new FakeTarget(20, 0);
    p.finisherTargets = [t];
    p.step({ attack: true });
    expect(p.state).toBe('finisher');
    expect(t.held).toBe(true);
    p.run(Math.ceil(finisherTable.revolver!.durationMs / DT) + 2);
    expect(p.strikes).toBe(1);
    expect(t.alive).toBe(false);
    expect(p.state).toBe('idle');
  });

  it('ATK with no staggered enemy near is a normal attack', () => {
    const p = new SimPlayer();
    p.run(5);
    const t = new FakeTarget(20, 0);
    t.staggered = false;
    p.finisherTargets = [t];
    p.step({ attack: true });
    expect(p.state).toBe('attack');
  });
});
