import type { Rect } from '../combat/types';
import tileDefs from '../data/tiles.json';

export const TILE = tileDefs.tileSize;
/** Screen-sized cell of the world grid (tiles). */
export const CELL_COLS = 30;
export const CELL_ROWS = 17;
const KIND = new Map(tileDefs.tiles.map((t) => [t.gid, t.kind]));
export const tileKind = (gid: number): string => (gid === 0 ? 'none' : KIND.get(gid) ?? 'none');

/**
 * Rooms are Tiled maps (.tmj, JSON). For now they use object layers only (art tiles come in Milestone 6):
 *   solids     rectangles: floors, walls, platforms
 *   hazards    rectangles: spikes (property damage)
 *   exits      rectangles: walking in moves to room `to`, entry `entry`
 *   gates      rectangles: solid until flag `opens` is set (by a lever)
 *   markers    points by type: entry (name), enemy (enemy), dummy (maxHealth, contactDamage), checkpoint,
 *              lever (flag), label (text), lore (lore = id in src/data/lore.json)
 * Coordinates are internal pixels; points mark the FEET position.
 */

interface TiledProperty {
  name: string;
  type?: string;
  value: string | number | boolean;
}

export interface TiledObject {
  id: number;
  name?: string;
  type?: string;
  /** Tiled 1.9+ writes `type` as `class` in some exports. */
  class?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  point?: boolean;
  properties?: TiledProperty[];
}

export interface TiledLayer {
  name: string;
  type: string;
  objects?: TiledObject[];
  /** Tile layers: gids, row-major. */
  data?: number[];
}

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  properties?: TiledProperty[];
}

export interface Entry {
  x: number;
  y: number;
  facing: 1 | -1;
}

export interface Exit extends Rect {
  to: string;
  entry: string;
}

export interface Hazard extends Rect {
  damage: number;
}

export interface Gate extends Rect {
  opens: string;
}

export interface RoomData {
  id: string;
  title: string;
  width: number;
  height: number;
  /** Position on the world grid (screen cells) and in world pixels. */
  gridX: number;
  gridY: number;
  originX: number;
  originY: number;
  cols: number;
  rows: number;
  /** Tile layers (gids, row-major); empty arrays for object-only rooms. */
  layers: { back: number[]; terrain: number[]; facade: number[]; shade: number[] };
  /** Building interior id per cell (-1 = outdoors), from the facade layer; and how many there are. */
  interior: Int16Array;
  interiorCount: number;
  solids: Rect[];
  /** Platforms you can jump up through and stand on. */
  oneways: Rect[];
  /** Ladder columns. */
  ladders: Rect[];
  hazards: Hazard[];
  exits: Exit[];
  gates: Gate[];
  entries: Record<string, Entry>;
  enemies: { type: string; x: number; y: number }[];
  dummies: { x: number; y: number; maxHealth: number; contactDamage: number }[];
  checkpoints: { id: string; x: number; y: number }[];
  levers: { flag: string; x: number; y: number }[];
  labels: { x: number; y: number; text: string }[];
  lore: { id: string; x: number; y: number }[];
  /** Props drawn in code: lamp, lantern, crate, barrel, banner, chain. */
  decor: { item: string; x: number; y: number; h: number }[];
  /** Open sky behind the room (false underground). */
  outdoor: boolean;
  /** Street level (px): skylines stand on it. */
  horizon: number;
}

function props(o: { properties?: TiledProperty[] }): Record<string, string | number | boolean> {
  return Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));
}

function rect(o: TiledObject): Rect {
  return { x: o.x, y: o.y, w: o.width ?? 0, h: o.height ?? 0 };
}

const kind = (o: TiledObject): string => o.type || o.class || '';

/** Converts and validates one Tiled map; throws a readable error naming the room and object on bad data. */
export function parseRoom(id: string, map: TiledMap): RoomData {
  const fail = (msg: string): never => {
    throw new Error(`room "${id}": ${msg}`);
  };
  const layer = (name: string): TiledObject[] => map.layers.find((l) => l.name === name)?.objects ?? [];
  const mp = props(map);
  const tiles = (name: string): number[] => map.layers.find((l) => l.name === name && l.type === 'tilelayer')?.data ?? [];
  const terrain = tiles('terrain');
  const facade = tiles('facade');
  const cols = map.width;
  const rows = map.height;
  const gridX = Number(mp.gridX ?? 0);
  const gridY = Number(mp.gridY ?? 0);
  const { ids: interior, count: interiorCount } = components(facade, cols, rows);
  const room: RoomData = {
    id,
    title: String(mp.title ?? id),
    width: cols * map.tilewidth,
    height: rows * map.tileheight,
    gridX,
    gridY,
    originX: gridX * CELL_COLS * TILE,
    originY: gridY * CELL_ROWS * TILE,
    cols,
    rows,
    layers: { back: tiles('back'), terrain, facade, shade: tiles('shade') },
    interior,
    interiorCount,
    solids: [...layer('solids').map(rect), ...mergeCells(terrain, cols, rows, (g) => tileKind(g) === 'solid')],
    oneways: mergeCells(terrain, cols, rows, (g) => tileKind(g) === 'oneway'),
    ladders: mergeCells(terrain, cols, rows, (g) => tileKind(g) === 'ladder'),
    hazards: [
      ...layer('hazards').map((o) => ({ ...rect(o), damage: Number(props(o).damage ?? 20) })),
      ...mergeCells(terrain, cols, rows, (g) => tileKind(g) === 'spike').map((r) => ({ ...r, y: r.y + TILE / 2, h: r.h - TILE / 2, damage: 20 })),
    ],
    exits: layer('exits').map((o) => {
      const p = props(o);
      if (!p.to || !p.entry) fail(`exit ${o.id} needs 'to' and 'entry' properties`);
      return { ...rect(o), to: String(p.to), entry: String(p.entry) };
    }),
    gates: layer('gates').map((o) => {
      const p = props(o);
      if (!p.opens) fail(`gate ${o.id} needs an 'opens' property`);
      return { ...rect(o), opens: String(p.opens) };
    }),
    entries: {},
    enemies: [],
    dummies: [],
    checkpoints: [],
    levers: [],
    labels: [],
    lore: [],
    decor: [],
    outdoor: String(mp.sky ?? 'open') !== 'none',
    horizon: Number(mp.horizon ?? rows * map.tileheight),
  };
  for (const o of layer('markers')) {
    const p = props(o);
    switch (kind(o)) {
      case 'entry':
        if (!o.name) fail(`entry ${o.id} needs a name`);
        room.entries[o.name!] = { x: o.x, y: o.y, facing: Number(p.facing ?? 1) < 0 ? -1 : 1 };
        break;
      case 'enemy':
        if (!p.enemy) fail(`enemy marker ${o.id} needs an 'enemy' property`);
        room.enemies.push({ type: String(p.enemy), x: o.x, y: o.y });
        break;
      case 'dummy':
        room.dummies.push({ x: o.x, y: o.y, maxHealth: Number(p.maxHealth ?? 60), contactDamage: Number(p.contactDamage ?? 0) });
        break;
      case 'checkpoint':
        room.checkpoints.push({ id: o.name || `${id}:${o.id}`, x: o.x, y: o.y });
        break;
      case 'lever':
        if (!p.flag) fail(`lever ${o.id} needs a 'flag' property`);
        room.levers.push({ flag: String(p.flag), x: o.x, y: o.y });
        break;
      case 'label':
        room.labels.push({ x: o.x, y: o.y, text: String(p.text ?? o.name ?? '') });
        break;
      case 'decor':
        room.decor.push({ item: String(p.item ?? 'crate'), x: o.x, y: o.y, h: Number(p.h ?? 0) });
        break;
      case 'lore':
        if (!p.lore) fail(`lore marker ${o.id} needs a 'lore' property`);
        room.lore.push({ id: String(p.lore), x: o.x, y: o.y });
        break;
      default:
        fail(`marker ${o.id} has unknown type "${kind(o)}"`);
    }
  }
  if (map.tilewidth !== TILE) fail(`tile size must be ${TILE}`);
  if (room.solids.length === 0) fail('has no solids');
  return room;
}

/** Merges cells matching `want` into rectangles (row runs, then stacked runs of equal width). Pure; exported for tests. */
export function mergeCells(data: number[], cols: number, rows: number, want: (gid: number) => boolean): Rect[] {
  const open = new Map<string, Rect>(); // runs that can still grow downward, keyed "x0,x1"
  const out: Rect[] = [];
  for (let y = 0; y < rows; y++) {
    const seen = new Set<string>();
    let x = 0;
    while (x < cols) {
      if (!want(data[y * cols + x] ?? 0)) {
        x++;
        continue;
      }
      const x0 = x;
      while (x < cols && want(data[y * cols + x] ?? 0)) x++;
      const key = `${x0},${x}`;
      const prev = open.get(key);
      if (prev && prev.y + prev.h === y * TILE) prev.h += TILE;
      else {
        const r = { x: x0 * TILE, y: y * TILE, w: (x - x0) * TILE, h: TILE };
        out.push(r);
        open.set(key, r);
      }
      seen.add(key);
    }
    for (const k of [...open.keys()]) if (!seen.has(k)) open.delete(k);
  }
  return out;
}

/** Connected groups of non-empty cells (4-neighbour): one id per building interior. */
function components(data: number[], cols: number, rows: number): { ids: Int16Array; count: number } {
  const ids = new Int16Array(cols * rows).fill(-1);
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    if (!data[i] || ids[i] !== -1) continue;
    const stack = [i];
    ids[i] = count;
    while (stack.length) {
      const c = stack.pop()!;
      const cx = c % cols;
      for (const n of [c - cols, c + cols, cx > 0 ? c - 1 : -1, cx < cols - 1 ? c + 1 : -1]) {
        if (n >= 0 && n < data.length && data[n] && ids[n] === -1) {
          ids[n] = count;
          stack.push(n);
        }
      }
    }
    count++;
  }
  return { ids, count };
}
