import { describe, expect, it } from 'vitest';
import { DuelistBrain, type DuelistConfig, type DuelEvent } from '../src/enemies/boss/DuelistBrain';
import paula from '../src/data/bosses/paula.json';
import kampfer from '../src/data/bosses/kampfer.json';
import petros from '../src/data/bosses/petros.json';
import { relics } from '../src/systems/progression';

const DT = 1000 / 60;
const L = 0;
const R = 480;
const all = { paula, kampfer, petros } as unknown as Record<string, DuelistConfig>;

function fight(cfg: DuelistConfig, ms: number, hurtAfter = Infinity) {
  const b = new DuelistBrain(cfg, 380, L, R);
  const states = new Set<string>();
  const events: DuelEvent[] = [];
  let px = 120;
  let lastIdle = 0;
  let longest = 0;
  let projectiles = 0;
  let waves = 0;
  for (let t = 0; t < ms; t += DT) {
    if (Math.floor(t / 900) % 2 === 0) px = (Math.sin(t / 1300) * 0.45 + 0.5) * R;
    b.update(DT, px);
    states.add(b.state);
    events.push(...b.drainEvents());
    projectiles = Math.max(projectiles, b.projectiles.length);
    waves = Math.max(waves, b.waves.length);
    expect(b.x).toBeGreaterThanOrEqual(L);
    expect(b.x).toBeLessThanOrEqual(R);
    if (b.state === 'idle') {
      longest = Math.max(longest, t - lastIdle);
      lastIdle = t;
    }
    if (t > hurtAfter && b.alive) b.takeDamage(4);
  }
  return { b, states, events, longest, projectiles, waves };
}

describe('mini bosses (data-driven duelists)', () => {
  for (const [id, cfg] of Object.entries(all)) {
    it(`${id}: data is valid (moves, visuals, relic)`, () => {
      expect(() => new DuelistBrain(cfg, 200, L, R)).not.toThrow();
      expect(relics[cfg.relic]).toBeDefined();
      for (const a of Object.keys(cfg.attacks)) {
        const used = Object.values(cfg.moves).some((m) => JSON.stringify(m).includes(`"${a}"`));
        expect(used, `${id}: attack ${a} unused`).toBe(true);
      }
    });

    it(`${id}: never gets stuck over two minutes, uses every move of phase 1, and goes down`, () => {
      const r = fight(cfg, 120_000, 70_000);
      expect(r.longest).toBeLessThan(9000);
      expect(r.b.alive).toBe(false);
      expect(r.events.some((e) => e.type === 'defeated')).toBe(true);
      expect(r.events.some((e) => e.type === 'phase')).toBe(true);
    });
  }

  it('Paula: combo, dash, leap and (phase 2) blink all happen', () => {
    const { states } = fight(all.paula!, 60_000, 25_000);
    for (const s of ['walk', 'attack', 'telegraph', 'dash', 'leap', 'dive', 'vanish']) expect(states.has(s), s).toBe(true);
  });

  it('Kampfer: casts projectiles, summons, blinks; his phase change can wait for a cutscene', () => {
    const r = fight(all.kampfer!, 40_000);
    expect(r.projectiles).toBeGreaterThan(0);
    expect(r.events.some((e) => e.type === 'summon')).toBe(true);
    const b = new DuelistBrain(all.kampfer!, 300, L, R);
    for (let t = 0; t < 3000; t += DT) b.update(DT, 100);
    b.holdForScene = true;
    b.takeDamage(Math.ceil(b.health.max * 0.45));
    expect(b.state).toBe('phase');
    for (let t = 0; t < 5000; t += DT) b.update(DT, 100);
    expect(b.state).toBe('phase');
    b.holdForScene = false;
    for (let t = 0; t < 3000; t += DT) b.update(DT, 100);
    expect(b.state).not.toBe('phase');
  });

  it('Petros: thrusts, a charge from the arena edge, and a slam with shockwaves', () => {
    const r = fight(all.petros!, 40_000);
    expect(r.states.has('dash')).toBe(true);
    expect(r.waves).toBeGreaterThan(0);
  });

  it('a parry staggers a blade but not a spell or a dive', () => {
    const b = new DuelistBrain(all.paula!, 140, L, R);
    for (let t = 0; t < 8000 && b.state !== 'attack'; t += DT) b.update(DT, 100);
    b.parried();
    expect(b.state).toBe('staggered');
    const k = new DuelistBrain(all.kampfer!, 300, L, R);
    for (let t = 0; t < 8000 && k.state !== 'cast'; t += DT) k.update(DT, 100);
    k.parried();
    expect(k.state).toBe('cast');
  });
});
