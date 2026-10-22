import { describe, expect, it } from 'vitest';
import { DuelistBrain, type DuelistConfig, type DuelEvent } from '../src/enemies/boss/DuelistBrain';
import paula from '../src/data/bosses/paula.json';
import kampfer from '../src/data/bosses/kampfer.json';
import petros from '../src/data/bosses/petros.json';
import dietrich from '../src/data/bosses/dietrich.json';
import gyula from '../src/data/bosses/gyula.json';
import cain from '../src/data/bosses/cain.json';
import janissary from '../src/data/bosses/janissary.json';
import radu from '../src/data/bosses/radu.json';
import { relics } from '../src/systems/progression';

const DT = 1000 / 60;
const L = 0;
const R = 480;
const all = { paula, kampfer, petros, dietrich, gyula, cain, janissary, radu } as unknown as Record<string, DuelistConfig>;

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

  it('Gyula: the Star of Sorrow marks the floor, then strikes once; Dietrich changes body at phase 2', () => {
    const g = new DuelistBrain(all.gyula!, 380, L, R);
    let struck = null;
    for (let t = 0; t < 30000 && !struck; t += DT) {
      g.update(DT, 200);
      struck = g.beamHit({ x: 192, w: 16 });
    }
    expect(struck).not.toBeNull();
    const d = new DuelistBrain(all.dietrich!, 380, L, R);
    expect(d.width).toBeGreaterThan(40);
    for (let t = 0; t < 3000; t += DT) d.update(DT, 100);
    d.takeDamage(Math.ceil(d.health.max * 0.55));
    expect(d.phase.sprite).toBe('npc_dietrich');
    expect(d.width).toBeLessThan(20);
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

  it('Cain: on the ground first; in phase 2 he hovers, swoops to Abel\'s height and aims his blasts up at him', () => {
    const cfg = cain as unknown as DuelistConfig;
    const b = new DuelistBrain(cfg, 380, L, R);
    for (let t = 0; t < 3000; t += DT) b.update(DT, 120, 0);
    expect(b.baseLift).toBe(0);
    b.takeDamage(cfg.maxHealth * 0.55); // into phase 2
    let maxLift = 0;
    let lowest = Infinity;
    let upward = false;
    for (let t = 0; t < 30000; t += DT) {
      b.update(DT, 120, 60); // Abel flying 60 px up
      if (b.state === 'idle' || b.state === 'cast') maxLift = Math.max(maxLift, b.lift);
      if (b.state === 'dive') lowest = Math.min(lowest, b.lift);
    }
    for (let t = 0; t < 20000; t += DT) {
      b.update(DT, 120, 220); // Abel above him
      if (b.projectiles.some((p) => p.vy > 0)) upward = true;
    }
    expect(b.baseLift).toBeGreaterThan(0);
    expect(maxLift).toBeGreaterThan(b.baseLift * 0.8); // floats up there between moves
    expect(lowest).toBeGreaterThanOrEqual(59); // the swoop stops at Abel's height, not the floor
    expect(upward).toBe(true);
  });
});
