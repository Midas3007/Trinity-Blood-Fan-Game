import type { CheckpointRef, TimeOfDay } from '../GameState';

/** Current save layout. Bump it when the layout changes and add a step to `migrate`. */
export const SAVE_VERSION = 2;

export interface SaveData {
  version: typeof SAVE_VERSION;
  /** Last altar prayed at; a loaded game starts there (null = the start of the game). */
  checkpoint: CheckpointRef | null;
  flags: string[];
  visited: string[];
  time: TimeOfDay;
  /** When it was written (ms since 1970), for the title screen. */
  savedAt: number;
}

const TIMES: readonly TimeOfDay[] = ['night', 'dusk', 'day'];

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

function checkpointOf(v: unknown): CheckpointRef | null | undefined {
  if (v === null) return null;
  if (isObject(v) && typeof v.room === 'string' && typeof v.id === 'string') return { room: v.room, id: v.id };
  return undefined;
}

/** Older layouts → the current one. Returns null for anything unrecognised. */
function migrate(d: Raw): Raw | null {
  let cur = d;
  // v1 (first GameState.toJSON): had hp, no time of day. A loaded game always starts at full health.
  if (cur.version === 1) cur = { ...cur, version: 2, time: 'night', savedAt: 0 };
  return cur.version === SAVE_VERSION ? cur : null;
}

/** Parse and check a stored save. Corrupt, unknown or future saves give null (the caller falls back). */
export function decodeSave(raw: string | null): SaveData | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(parsed)) return null;
  const d = migrate(parsed);
  if (!d) return null;
  const checkpoint = checkpointOf(d.checkpoint);
  if (checkpoint === undefined || !isStringArray(d.flags) || !isStringArray(d.visited)) return null;
  if (!TIMES.includes(d.time as TimeOfDay) || typeof d.savedAt !== 'number') return null;
  return { version: SAVE_VERSION, checkpoint, flags: [...d.flags], visited: [...d.visited], time: d.time as TimeOfDay, savedAt: d.savedAt };
}

export function encodeSave(d: SaveData): string {
  return JSON.stringify(d);
}
