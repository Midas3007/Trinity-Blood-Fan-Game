import { CELL_COLS, CELL_ROWS, tileKind, type RoomData } from './tiled';

/** Global tile column/row of a room's top-left tile. */
const col0 = (r: RoomData): number => r.gridX * CELL_COLS;
const row0 = (r: RoomData): number => r.gridY * CELL_ROWS;

/** The room containing global tile (gc, gr), if any. */
export function roomAtTile(rooms: Record<string, RoomData>, gc: number, gr: number): RoomData | null {
  for (const r of Object.values(rooms)) {
    if (gc >= col0(r) && gc < col0(r) + r.cols && gr >= row0(r) && gr < row0(r) + r.rows) return r;
  }
  return null;
}

/** The room containing world pixel (x, y), if any. */
export function roomAtPixel(rooms: Record<string, RoomData>, x: number, y: number, tile: number): RoomData | null {
  return roomAtTile(rooms, Math.floor(x / tile), Math.floor(y / tile));
}

const openAt = (r: RoomData, c: number, row: number): boolean => tileKind(r.layers.terrain[row * r.cols + c] ?? 0) !== 'solid';

interface Crossing {
  from: RoomData;
  to: RoomData | null;
  /** The matching cell in `to` is open too. */
  matched: boolean;
  where: string;
}

/** Every open cell on a room's left, right and bottom edges (and top, when a room is above) and where it leads. */
function crossings(rooms: Record<string, RoomData>, r: RoomData): Crossing[] {
  const out: Crossing[] = [];
  const probe = (c: number, row: number, dc: number, dr: number, where: string, optional: boolean): void => {
    if (!openAt(r, c, row)) return;
    const gc = col0(r) + c + dc;
    const gr = row0(r) + row + dr;
    const to = roomAtTile(rooms, gc, gr);
    if (!to && optional) return;
    out.push({ from: r, to, matched: to !== null && openAt(to, gc - col0(to), gr - row0(to)), where: `${where} (${c},${row})` });
  };
  for (let row = 0; row < r.rows; row++) {
    probe(0, row, -1, 0, 'west edge', false);
    probe(r.cols - 1, row, 1, 0, 'east edge', false);
  }
  for (let c = 0; c < r.cols; c++) {
    probe(c, r.rows - 1, 0, 1, 'bottom edge', false);
    probe(c, 0, 0, -1, 'top edge', true); // open sky is fine
  }
  return out;
}

/** Problems with how rooms fit together; empty when the world is sound. Pure; used by tests. */
export function worldProblems(rooms: Record<string, RoomData>, start: { room: string; entry: string }): string[] {
  const out: string[] = [];
  if (!rooms[start.room]?.entries[start.entry]) out.push(`start ${start.room}/${start.entry} does not exist`);
  const list = Object.values(rooms);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]!;
      const b = list[j]!;
      const ox = col0(a) < col0(b) + b.cols && col0(b) < col0(a) + a.cols;
      const oy = row0(a) < row0(b) + b.rows && row0(b) < row0(a) + a.rows;
      if (ox && oy) out.push(`${a.id} overlaps ${b.id}`);
    }
  }
  for (const r of list) {
    const bad = new Set<string>();
    for (const c of crossings(rooms, r)) {
      if (!c.to) bad.add(`${r.id}: ${c.where.split(' (')[0]} is open but no room is there`);
      else if (!c.matched) bad.add(`${r.id}: ${c.where.split(' (')[0]} is open into a wall of ${c.to.id}`);
    }
    out.push(...bad);
  }
  for (const r of list) {
    for (const e of r.exits) {
      const to = rooms[e.to];
      if (!to) out.push(`${r.id}: door to unknown room ${e.to}`);
      else if (!to.entries[e.entry]) out.push(`${r.id}: door to ${e.to} names missing entry ${e.entry}`);
    }
  }
  const seen = reachable(rooms, start.room);
  for (const id of Object.keys(rooms)) if (!seen.has(id)) out.push(`${id} cannot be reached from ${start.room}`);
  return out;
}

/** Room ids reachable from `from` through matched open edges. */
export function reachable(rooms: Record<string, RoomData>, from: string): Set<string> {
  const seen = new Set<string>();
  const queue = [from];
  while (queue.length) {
    const id = queue.shift()!;
    const r = rooms[id];
    if (seen.has(id) || !r) continue;
    seen.add(id);
    for (const c of crossings(rooms, r)) if (c.to && c.matched) queue.push(c.to.id);
    for (const e of r.exits) queue.push(e.to); // doors (sealed ones count: their flag is reachable in play)
  }
  return seen;
}
