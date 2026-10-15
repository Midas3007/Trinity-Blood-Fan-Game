import { decodeSave, encodeSave } from '../src/systems/save/saveFormat';
import { describe, expect, it } from 'vitest';
import { rooms, START } from '../src/world/rooms';
import { worldProblems, reachable } from '../src/world/roomGraph';
import { mergeCells, parseRoom, type TiledMap } from '../src/world/tiled';
import { GameState } from '../src/systems/GameState';
import { enemyConfigs } from '../src/enemies/enemyConfig';
import { loreEntry } from '../src/ui/LorePanel';
import world from '../src/data/world.json';

describe('rooms (Tiled maps)', () => {
  it('loads every room in src/data/rooms', () => {
    expect(Object.keys(rooms).length).toBeGreaterThanOrEqual(5);
    expect(rooms[START.room]).toBeDefined();
  });

  it('room graph: every exit leads to a real room and entry, can be walked back, and every room is reachable', () => {
    expect(worldProblems(rooms, START)).toEqual([]);
    expect(reachable(rooms, START.room).size).toBe(Object.keys(rooms).length);
  });

  it('every enemy marker names a known enemy type, every gate has a lever or story event, every lore id exists', () => {
    const levers = new Set([...Object.values(rooms).flatMap((r) => r.levers.map((l) => l.flag)), ...world.storyFlags]);
    for (const r of Object.values(rooms)) {
      for (const e of r.enemies) expect(enemyConfigs[e.type], `${r.id}: ${e.type}`).toBeDefined();
      for (const g of r.gates) expect(levers.has(g.opens), `${r.id}: gate ${g.opens}`).toBe(true);
      for (const l of r.lore) expect(loreEntry(l.id), `${r.id}: lore ${l.id}`).not.toBeNull();
    }
  });

  it('the town has altars, hazards, interiors and climbable floors', () => {
    const all = Object.values(rooms);
    expect(all.some((r) => r.checkpoints.length > 0)).toBe(true);
    expect(all.some((r) => r.hazards.length > 0)).toBe(true);
    expect(all.some((r) => r.interiorCount > 0)).toBe(true);
    expect(all.some((r) => r.oneways.length > 0)).toBe(true);
    expect(all.some((r) => r.gates.length > 0 && r.levers.length > 0)).toBe(true); // a lever-and-gate puzzle
    expect(all.some((r) => r.ladders.length > 0)).toBe(true);
  });

  it('every marker stands inside its room', () => {
    for (const r of Object.values(rooms)) {
      for (const m of [...r.enemies, ...r.checkpoints, ...r.lore, ...Object.values(r.entries)]) {
        expect(m.x > 0 && m.x < r.width && m.y > 0 && m.y <= r.height, `${r.id} marker at ${m.x},${m.y}`).toBe(true);
      }
    }
  });

  it('detects open edges with no room behind them, and unreachable rooms', () => {
    const { clock_alley: _gone, ...rest } = rooms;
    expect(worldProblems(rest, START).join('\n')).toMatch(/old_town_lane: east edge is open but no room is there/);
    const far = { ...structuredClone(rooms.sewer_shaft!), id: 'far', gridX: 40 };
    expect(worldProblems({ ...rooms, far }, START).join('\n')).toMatch(/far cannot be reached/);
  });

  it('mergeCells joins runs and stacks of equal width', () => {
    // 4x3: a 2x2 block at the left, one cell on the right of the bottom row
    const d = [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1];
    expect(mergeCells(d, 4, 3, (g) => g === 1)).toEqual([
      { x: 0, y: 0, w: 32, h: 32 },
      { x: 48, y: 32, w: 16, h: 16 },
    ]);
  });

  it('rejects malformed maps with a readable error', () => {
    const map: TiledMap = { width: 10, height: 17, tilewidth: 16, tileheight: 16, layers: [] };
    expect(() => parseRoom('bad', map)).toThrow(/room "bad"/);
  });
});

describe('GameState', () => {
  it('keeps flags, checkpoint, visited rooms and time through a save', () => {
    const s = new GameState();
    s.setFlag('crypt_gate');
    s.checkpoint = { room: 'undercity_hall', id: 'hall_altar' };
    s.hp = 55;
    s.time = 'dusk';
    s.visit('undercity_hall');
    const back = new GameState();
    back.load(decodeSave(encodeSave(s.toSave(123))));
    expect(back.hasFlag('crypt_gate')).toBe(true);
    expect(back.checkpoint).toEqual(s.checkpoint);
    expect(back.hp).toBeNull(); // a loaded game starts fully healed
    expect(back.time).toBe('dusk');
    expect(back.hasVisited('undercity_hall')).toBe(true);
  });

  it('load(null) is a fresh game', () => {
    const s = new GameState();
    s.setFlag('x');
    s.checkpoint = { room: 'a', id: 'b' };
    s.load(null);
    expect(s.hasFlag('x')).toBe(false);
    expect(s.checkpoint).toBeNull();
  });
});
