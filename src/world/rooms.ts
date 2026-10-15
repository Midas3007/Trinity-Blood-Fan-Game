import { parseRoom, type RoomData, type TiledMap } from './tiled';
import world from '../data/world.json';

// Every Tiled map in src/data/rooms, keyed by file name (without .tmj).
const files = import.meta.glob<string>('../data/rooms/*.tmj', { eager: true, query: '?raw', import: 'default' });

export const rooms: Record<string, RoomData> = Object.fromEntries(
  Object.entries(files).map(([path, text]) => {
    const id = path.replace(/^.*\//, '').replace(/\.tmj$/, '');
    return [id, parseRoom(id, JSON.parse(text) as TiledMap)];
  }),
);

export const START: { room: string; entry: string } = world.start;

export function room(id: string): RoomData {
  const r = rooms[id];
  if (!r) throw new Error(`unknown room "${id}"`);
  return r;
}
