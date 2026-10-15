import lore from '../data/lore.json';
import { rooms } from '../world/rooms';
import type { SaveData } from './save/saveFormat';

/**
 * How far a save has gone, 0..1, for the title screen (owner request). Story fights weigh most, then the map
 * explored, then lore found. Fights not built yet still count, so the bar never reads 100% before the end.
 */
export const STORY_FLAGS = [
  'paula_defeated',
  'kampfer_defeated',
  'marchesa_defeated',
  'petros_defeated',
  'dietrich_defeated', // Region 2 (planned)
  'gyula_defeated', // final battle (planned)
] as const;

const WEIGHTS = { story: 0.7, map: 0.2, lore: 0.1 };

export function gameProgress(save: Pick<SaveData, 'flags' | 'visited'> | null): number {
  if (!save) return 0;
  const flags = new Set(save.flags);
  const story = STORY_FLAGS.filter((f) => flags.has(f)).length / STORY_FLAGS.length;
  const allRooms = Object.keys(rooms);
  const map = allRooms.length ? save.visited.filter((r) => allRooms.includes(r)).length / allRooms.length : 0;
  const loreIds = Object.keys((lore as { entries: Record<string, unknown> }).entries);
  const found = loreIds.filter((id) => flags.has(`lore:${id}`)).length / Math.max(1, loreIds.length);
  return Math.min(1, story * WEIGHTS.story + map * WEIGHTS.map + found * WEIGHTS.lore);
}
