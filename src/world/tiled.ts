import type { Rect } from '../combat/types';

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
  solids: Rect[];
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
  const room: RoomData = {
    id,
    title: String(mp.title ?? id),
    width: map.width * map.tilewidth,
    height: map.height * map.tileheight,
    solids: layer('solids').map(rect),
    hazards: layer('hazards').map((o) => ({ ...rect(o), damage: Number(props(o).damage ?? 20) })),
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
      case 'lore':
        if (!p.lore) fail(`lore marker ${o.id} needs a 'lore' property`);
        room.lore.push({ id: String(p.lore), x: o.x, y: o.y });
        break;
      default:
        fail(`marker ${o.id} has unknown type "${kind(o)}"`);
    }
  }
  if (Object.keys(room.entries).length === 0) fail('needs at least one entry marker');
  if (room.solids.length === 0) fail('has no solids');
  return room;
}
