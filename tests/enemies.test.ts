import { describe, expect, it } from 'vitest';
import { AttackRunner } from '../src/combat/AttackRunner';
import { CombatSystem, type ContactHazard, type PlayerCombatant } from '../src/combat/CombatSystem';
import { Health } from '../src/combat/Health';
import type { Damageable, HitInfo, Rect } from '../src/combat/types';
import { buildEnemyConfig, enemyConfig } from '../src/enemies/enemyConfig';
import { canSee, groundAheadOf } from '../src/enemies/sensing';
import { EventBus } from '../src/systems/EventBus';
import type { GameEvents } from '../src/systems/gameEvents';
import { Pool } from '../src/systems/Pool';
import { attackTable } from '../src/combat/attackData';
import { SimEnemy } from './enemySim';
import enemiesJson from '../src/data/enemies.json';

const cfg = enemyConfig('thrall');

describe('Pool', () => {
  it('reuses the same objects and never allocates beyond its size', () => {
    let created = 0;
    const pool = new Pool(2, () => ({ n: created++ }));
    const a = pool.acquire();
    const b = pool.acquire();
    expect(pool.acquire()).toBeNull();
    pool.release(a!);
    pool.release(a!); // double release is ignored
    expect(pool.available).toBe(1);
    expect(pool.acquire()).toBe(a);
    expect(created).toBe(2);
    expect(pool.active()).toContain(b);
  });
});

describe('enemy data', () => {
  it('the thrall config loads and its attack is valid', () => {
    expect(cfg.attacks[cfg.attack]).toBeDefined();
    expect(cfg.detectRange).toBeGreaterThan(cfg.attackRange);
  });

  it('rejects inconsistent enemy data', () => {
    const raw = structuredClone(enemiesJson.types.thrall);
    expect(() => buildEnemyConfig('x', { ...raw, attack: 'nope' })).toThrow(/not in its attacks/);
    expect(() => buildEnemyConfig('x', { ...raw, detectRange: 10 })).toThrow(/detectRange/);
    expect(() => buildEnemyConfig('x', { ...raw, loseRange: 50 })).toThrow(/loseRange/);
  });
});

describe('sensing', () => {
  it('sees far in front, only a little behind, and not on another floor', () => {
    expect(canSee(cfg, 0, 0, 1, cfg.detectRange - 1, 0)).toBe(true);
    expect(canSee(cfg, 0, 0, 1, cfg.detectRange + 1, 0)).toBe(false);
    expect(canSee(cfg, 0, 0, 1, -(cfg.detectRear - 1), 0)).toBe(true);
    expect(canSee(cfg, 0, 0, 1, -(cfg.detectRear + 10), 0)).toBe(false);
    expect(canSee(cfg, 0, 0, 1, 20, cfg.detectHeight + 5)).toBe(false);
  });

  it('detects the end of a ledge', () => {
    const floor: Rect[] = [{ x: 0, y: 100, w: 50, h: 10 }];
    expect(groundAheadOf(20, 100, 16, 1, floor)).toBe(true);
    expect(groundAheadOf(45, 100, 16, 1, floor)).toBe(false);
  });
});

describe('thrall behaviour', () => {
  it('idles, then patrols, then idles again at the end of the leg', () => {
    const e = new SimEnemy(cfg);
    expect(e.state).toBe('idle');
    expect(e.runUntil('patrol')).toBeGreaterThan(0);
    e.step();
    expect(Math.abs(e.vx)).toBeCloseTo(cfg.walkSpeed);
    expect(e.runUntil('idle')).toBeGreaterThan(0);
    expect(Math.abs(e.x - cfg.patrolDistance * (e.patrolDir === 1 ? -1 : 1))).toBeLessThan(6);
  });

  it('turns back at a ledge instead of walking off', () => {
    const e = new SimEnemy(cfg, 0, -15, 15);
    for (let i = 0; i < 1200; i++) {
      e.step();
      expect(e.x).toBeGreaterThanOrEqual(-15);
      expect(e.x).toBeLessThanOrEqual(15);
    }
    expect(['idle', 'patrol']).toContain(e.state);
  });

  it('spots the player in front, pauses (alert), then chases', () => {
    const e = new SimEnemy(cfg);
    e.facing = 1;
    e.target = { x: 80, y: 0, alive: true };
    e.step();
    expect(e.state).toBe('alert');
    expect(e.vx).toBe(0);
    expect(e.runUntil('pursue')).toBeGreaterThan(0);
    e.step();
    expect(e.vx).toBeCloseTo(cfg.chaseSpeed);
  });

  it('does not notice a player standing well behind it', () => {
    const e = new SimEnemy(cfg);
    e.facing = 1;
    e.target = { x: -80, y: 0, alive: true };
    e.step();
    expect(e.state).toBe('idle');
  });

  it('attacks in range with a wind-up, then respects the cooldown', () => {
    const e = new SimEnemy(cfg);
    e.target = { x: 60, y: 0, alive: true };
    expect(e.runUntil('attack', 300)).toBeGreaterThan(0);
    const claw = cfg.attacks[cfg.attack]!;
    expect(e.combat.phase).toBe('startup'); // telegraph first
    expect(e.runUntil('pursue', 200)).toBeGreaterThan(0);
    expect(e.attackCooldown).toBeGreaterThan(0);
    e.step();
    expect(e.state).toBe('pursue'); // can't attack again during cooldown
    expect(claw.startupMs).toBeGreaterThan(300); // readable wind-up
  });

  it('gives up when the player runs far away', () => {
    const e = new SimEnemy(cfg);
    e.target = { x: 60, y: 0, alive: true };
    e.runUntil('pursue');
    e.target = { x: 2000, y: 0, alive: true };
    e.step();
    expect(e.state).toBe('idle');
  });

  it('waits at a ledge, then gives up, if the player is out of reach', () => {
    const e = new SimEnemy(cfg, 0, -20, 20);
    e.facing = 1;
    e.target = { x: 100, y: 0, alive: true };
    e.runUntil('pursue');
    expect(e.runUntil('idle', 400)).toBeGreaterThan(0);
    expect(e.x).toBeLessThanOrEqual(20);
  });

  it('stops chasing when the player dies', () => {
    const e = new SimEnemy(cfg);
    e.target = { x: 60, y: 0, alive: true };
    e.runUntil('pursue');
    e.target = { x: 60, y: 0, alive: false };
    e.step();
    expect(e.state).toBe('idle');
  });

  it('hurt: staggers for the stun time, then comes after the player', () => {
    const e = new SimEnemy(cfg);
    e.target = { x: 100, y: 0, alive: true };
    e.vx = -100;
    e.fsm.transition('hurt');
    e.run(Math.floor(cfg.hurtStunMs / (1000 / 60)) - 1);
    expect(e.state).toBe('hurt');
    e.run(3);
    expect(e.state).toBe('pursue');
  });

  it('never gets stuck: random player movement for 2 minutes keeps it cycling through valid states', () => {
    const e = new SimEnemy(cfg, 0, -120, 120);
    const seen = new Set<string>();
    let sameStateFrames = 0;
    let last = e.state;
    let seed = 42;
    const rand = (): number => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let i = 0; i < 60 * 120; i++) {
      if (i % 30 === 0) e.target = { x: (rand() - 0.5) * 400, y: rand() < 0.2 ? 80 : 0, alive: rand() > 0.05 };
      if (i % 400 === 0 && rand() < 0.5) {
        e.vx = 120;
        e.fsm.transition('hurt');
      }
      e.step();
      seen.add(e.state);
      sameStateFrames = e.state === last ? sameStateFrames + 1 : 0;
      last = e.state;
      // No state other than idle/patrol/pursue lasts longer than 5 seconds.
      if (!['idle', 'patrol', 'pursue'].includes(e.state)) expect(sameStateFrames).toBeLessThan(300);
    }
    for (const s of ['idle', 'patrol', 'alert', 'pursue', 'attack', 'hurt']) expect(seen).toContain(s);
  });
});

describe('CombatSystem', () => {
  function fakePlayer(): PlayerCombatant & { hits: HitInfo[]; inv: boolean } {
    const health = new Health(100);
    const p = {
      id: 1,
      x: 0,
      y: 0,
      facing: 1 as const,
      combat: new AttackRunner(attackTable),
      health,
      hits: [] as HitInfo[],
      inv: false,
      get alive() {
        return !health.dead;
      },
      get invulnerable() {
        return p.inv;
      },
      hurtbox: (): Rect => ({ x: -7, y: -15, w: 14, h: 30 }),
      receiveHit(hit: HitInfo) {
        if (p.inv) return false;
        p.hits.push(hit);
        health.damage(hit.damage);
        p.inv = true;
        return true;
      },
    };
    return p;
  }

  it('enemy attacks hurt the player once and announce hurt/death events', () => {
    const bus = new EventBus<GameEvents>();
    const events: string[] = [];
    bus.on('player:hurt', () => events.push('hurt'));
    bus.on('player:died', () => events.push('died'));
    const player = fakePlayer();
    const sys = new CombatSystem(bus, player);
    const enemy = { x: -15, y: 0, facing: 1 as const, combat: new AttackRunner(cfg.attacks) };
    enemy.combat.begin(cfg.attack);
    enemy.combat.tick(cfg.attacks[cfg.attack]!.startupMs + 1);
    sys.step([], [enemy], []);
    sys.step([], [enemy], []);
    expect(player.hits).toHaveLength(1);
    expect(player.hits[0]!.knockbackX).toBeGreaterThan(0); // pushed away from the enemy
    expect(events).toEqual(['hurt']);
  });

  it('dodge invulnerability ignores contact damage; the player hitting an enemy reports a kill', () => {
    const bus = new EventBus<GameEvents>();
    const deaths: number[] = [];
    bus.on('enemy:died', ({ id }) => deaths.push(id));
    const player = fakePlayer();
    player.inv = true;
    const hazard: ContactHazard = {
      alive: true,
      contactDamage: 10,
      hurtbox: () => ({ x: -5, y: -5, w: 10, h: 10 }),
      contactHit: () => ({ damage: 10, knockbackX: 1, knockbackY: 0, hitstopMs: 0, shakeMs: 0, shakeIntensity: 0 }),
    };
    const target: Damageable & { hp: number } = {
      id: 9,
      x: 15,
      hp: 5,
      get alive() {
        return this.hp > 0;
      },
      hurtbox: () => ({ x: 8, y: -10, w: 16, h: 20 }),
      receiveHit(h) {
        this.hp -= h.damage;
        return true;
      },
    };
    const sys = new CombatSystem(bus, player);
    player.combat.begin('priest1');
    player.combat.tick(attackTable['priest1']!.startupMs + 1);
    sys.step([target], [], [hazard]);
    expect(player.hits).toHaveLength(0);
    expect(deaths).toEqual([9]);
  });
});
