import { describe, expect, it } from 'vitest';
import { rooms, START } from '../src/world/rooms';
import { worldProblems, reachable } from '../src/world/roomGraph';
import { parseRoom, type TiledMap } from '../src/world/tiled';
import { GameState } from '../src/systems/GameState';
import { enemyConfigs } from '../src/enemies/enemyConfig';
import { loreEntry } from '../src/ui/LorePanel';
import world from '../src/data/world.json';
import loreJson from '../src/data/lore.json';

describe('rooms (Tiled maps)', () => {
  it('loads every room in src/data/rooms', () => {
    expect(Object.keys(rooms).length).toBeGreaterThanOrEqual(12);
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

  it('there is at least one checkpoint, one hazard and one gated puzzle in the slice', () => {
    const all = Object.values(rooms);
    expect(all.some((r) => r.checkpoints.length > 0)).toBe(true);
    expect(all.some((r) => r.hazards.length > 0)).toBe(true);
    expect(all.some((r) => r.gates.length > 0)).toBe(true);
  });

  it('every lore entry is placed in some room', () => {
    const placed = new Set(Object.values(rooms).flatMap((r) => r.lore.map((l) => l.id)));
    for (const id of Object.keys(loreJson.entries)) expect(placed.has(id), id).toBe(true);
  });

  it('detects broken links and unreachable rooms', () => {
    const a = structuredClone(rooms.undercity_gate!);
    a.exits = [{ x: 0, y: 0, w: 16, h: 16, to: 'nowhere', entry: 'x' }];
    expect(worldProblems({ undercity_gate: a }, START).join()).toMatch(/unknown room "nowhere"/);
    const lone = structuredClone(rooms.undercity_shrine!);
    expect(worldProblems({ undercity_gate: rooms.undercity_gate!, undercity_shrine: lone }, START).join()).toMatch(/cannot be reached/);
  });

  it('rejects malformed maps with a readable error', () => {
    const map: TiledMap = { width: 10, height: 17, tilewidth: 16, tileheight: 16, layers: [] };
    expect(() => parseRoom('bad', map)).toThrow(/room "bad"/);
  });
});

describe('GameState', () => {
  it('keeps flags, checkpoint and health across a JSON round-trip', () => {
    const s = new GameState();
    s.setFlag('crypt_gate');
    s.checkpoint = { room: 'undercity_hall', id: 'hall_altar' };
    s.hp = 55;
    s.visit('undercity_hall');
    const back = GameState.fromJSON(JSON.parse(JSON.stringify(s.toJSON())));
    expect(back.hasFlag('crypt_gate')).toBe(true);
    expect(back.checkpoint).toEqual(s.checkpoint);
    expect(back.hp).toBe(55);
    expect(back.hasVisited('undercity_hall')).toBe(true);
  });
});
