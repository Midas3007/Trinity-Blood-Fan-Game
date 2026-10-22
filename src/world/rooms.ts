import { parseRoom, type RoomData, type TiledMap } from './tiled';
import world from '../data/world.json';
import { expandSwarms } from '../enemies/flyers/swarms';

// Every Tiled map in src/data/rooms, keyed by file name (without .tmj).
const files = import.meta.glob<string>('../data/rooms/*.tmj', { eager: true, query: '?raw', import: 'default' });

export const rooms: Record<string, RoomData> = Object.fromEntries(
  Object.entries(files).map(([path, text]) => {
    const id = path.replace(/^.*\//, '').replace(/\.tmj$/, '');
    const room = parseRoom(id, JSON.parse(text) as TiledMap);
    return [id, { ...room, enemies: expandSwarms(room.enemies) }]; // a swarm marker becomes its flock
  }),
);

export const START: { room: string; entry: string } = world.start;

/** Flags set by having entered a room (world.json roomFlags): those of every room in `visited`. */
export function roomFlags(visited: (id: string) => boolean): string[] {
  return Object.entries(world.roomFlags as Record<string, string>)
    .filter(([id]) => id !== '_note' && visited(id))
    .map(([, flag]) => flag);
}

export function room(id: string): RoomData {
  const r = rooms[id];
  if (!r) throw new Error(`unknown room "${id}"`);
  return r;
}
