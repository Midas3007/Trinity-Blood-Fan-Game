import { describe, expect, it } from 'vitest';
import { framesFor, SimPlayer } from './playerSim';
import { CrusnikMeter, crusnikConfig as cfg, crusnikTuning } from '../src/player/CrusnikMeter';
import { jumpHeight } from '../src/player/movement';
import { playerTuning } from '../src/player/tuning';
import { playerStates, type PlayerStateKey } from '../src/player/playerStates';
import { visualFor, type VisualKey } from '../src/player/PlayerView';
import { animDefs, type SpriteIndex } from '../src/systems/sprites/spriteIndex';
import { rooms } from '../src/world/rooms';
import index from '../public/assets/sprites/index.json';

const TILE = 16;

function readySim(): SimPlayer {
  const p = new SimPlayer();
  p.crusnik.unlocked = true;
  p.crusnik.fill();
  return p;
}

function transformed(): SimPlayer {
  const p = readySim();
  p.step({ ability: true });
  p.run(framesFor(cfg.transformMs) + 2);
  return p;
}

describe('Crusnik blood meter', () => {
  it('ignores blood until the form is awakened, then fills to ready', () => {
    const m = new CrusnikMeter();
    m.gain(500);
    expect(m.fraction).toBe(0);
    m.unlocked = true;
    for (let i = 0; i < Math.ceil(cfg.meterMax / cfg.gainPerHit); i++) m.gain(cfg.gainPerHit);
    expect(m.ready).toBe(true);
  });

  it('drains while active and ends at zero; combat does not refill it, a drain does', () => {
    const m = new CrusnikMeter();
    m.unlocked = true;
    m.fill();
    expect(m.activate()).toBe(true);
    expect(m.activate()).toBe(false);
    m.gain(50);
    expect(m.fraction).toBe(1);
    m.tick(1000);
    expect(m.fraction).toBeCloseTo(1 - cfg.drainPerSecond / cfg.meterMax);
    m.feed(cfg.gainPerDrain);
    expect(m.fraction).toBe(1);
    const lasts = (cfg.meterMax / cfg.drainPerSecond) * 1000;
    let ended = false;
    for (let t = 0; t < lasts + 100 && !ended; t += 100) ended = m.tick(100);
    expect(ended).toBe(true);
    expect(m.active).toBe(false);
  });
});

describe('Crusnik form (player states)', () => {
  it('ABIL does nothing while the form is asleep or the meter is not full', () => {
    const p = new SimPlayer();
    p.step({ ability: true });
    expect(p.state).toBe('idle');
    p.crusnik.unlocked = true;
    p.step({ ability: true });
    expect(p.state).toBe('idle');
  });

  it('ABIL with a full meter plays the change, then Abel is the Crusnik', () => {
    const p = readySim();
    p.step({ ability: true });
    expect(p.state).toBe('transform');
    expect(p.form).toBe('priest');
    p.run(framesFor(cfg.transformMs) + 2);
    expect(p.form).toBe('crusnik');
    expect(p.state).toBe('idle');
  });

  it('in Crusnik form: ATK swings the scythe, ABIL throws the chain lash, DODGE slides', () => {
    const p = transformed();
    p.step({ attack: true });
    expect(p.combat.current?.id).toBe('scythe');
    p.run(60);
    p.step({ ability: true });
    expect(p.state).toBe('lash');
    expect(p.combat.current?.id).toBe('lash');
    p.run(60);
    p.step({ dodge: true });
    expect(p.state).toBe('slide');
  });

  it('the chain lash reaches much further than any priest attack', () => {
    const p = transformed();
    p.step({ ability: true });
    const lash = p.combat.current!;
    expect(lash.hitbox.x + lash.hitbox.w / 2).toBeGreaterThan(100);
  });

  it('returns to the priest when the meter runs dry', () => {
    const p = transformed();
    p.run(framesFor((cfg.meterMax / cfg.drainPerSecond) * 1000) + 10);
    expect(p.form).toBe('priest');
  });

  it('leaps far higher than the priest jumps', () => {
    const p = transformed();
    p.run(80, { jump: true });
    expect(p.maxHeight).toBeGreaterThan(jumpHeight(crusnikTuning(playerTuning)) * 0.9);
  });
});

describe('Crusnik leap gate (Chapel of Bones -> Ballroom)', () => {
  const chapel = rooms['chapel_of_bones']!;
  // The doorway sill: the top of the solid block in the west wall's column 1.
  const wall = chapel.solids.filter((s) => s.x <= TILE && s.x + s.w > TILE && s.y > 0 && s.y < chapel.height - TILE * 3);
  const ledgeTop = Math.min(...wall.map((s) => s.y));
  const floor = 15 * TILE;
  const rise = floor - ledgeTop;

  it('the wall is too high for the priest and within the Crusnik leap', () => {
    expect(rise).toBe(6 * TILE);
    expect(jumpHeight(playerTuning)).toBeLessThan(rise);
    expect(jumpHeight(crusnikTuning(playerTuning))).toBeGreaterThan(rise + 8);
  });

  it('nothing else in the chapel is a stepping stone up to it', () => {
    const oneways = chapel.oneways.filter((o) => o.y < floor && o.y > ledgeTop - TILE);
    expect(oneways).toEqual([]);
  });
});

describe('Crusnik visuals', () => {
  const anims = new Set(animDefs(index as SpriteIndex).map((a) => a.key));
  it('every state (and look) has Crusnik art that exists', () => {
    const keys = [...(Object.keys(playerStates) as PlayerStateKey[]), 'walk', 'pray', 'climbStill'] as VisualKey[];
    for (const s of keys) {
      const v = visualFor(s, 'scythe', 'crusnik');
      expect(v, s).not.toBeNull();
      expect(anims.has(v!.anim), `${s} -> ${v!.anim}`).toBe(true);
    }
  });
});
