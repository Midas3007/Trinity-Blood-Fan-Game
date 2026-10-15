import type { RoomData } from './tiled';

/** Problems with how rooms connect; empty when the world is sound. Pure; used by tests and at load. */
export function worldProblems(rooms: Record<string, RoomData>, start: { room: string; entry: string }): string[] {
  const out: string[] = [];
  if (!rooms[start.room]?.entries[start.entry]) out.push(`start ${start.room}/${start.entry} does not exist`);
  for (const r of Object.values(rooms)) {
    for (const e of r.exits) {
      const target = rooms[e.to];
      if (!target) out.push(`${r.id}: exit to unknown room "${e.to}"`);
      else if (!target.entries[e.entry]) out.push(`${r.id}: exit to ${e.to} uses unknown entry "${e.entry}"`);
      // Coming back: the target room must have an exit leading here (rooms connect both ways).
      else if (!target.exits.some((b) => b.to === r.id)) out.push(`${r.id} -> ${e.to} has no way back`);
    }
    for (const [name, en] of Object.entries(r.entries)) {
      if (r.exits.some((e) => en.x >= e.x && en.x <= e.x + e.w && en.y > e.y && en.y - 1 <= e.y + e.h)) {
        out.push(`${r.id}: entry "${name}" stands inside an exit (would bounce straight back)`);
      }
    }
  }
  const seen = reachable(rooms, start.room);
  for (const id of Object.keys(rooms)) if (!seen.has(id)) out.push(`${id} cannot be reached from ${start.room}`);
  return out;
}

/** Room ids reachable from `from` by following exits. */
export function reachable(rooms: Record<string, RoomData>, from: string): Set<string> {
  const seen = new Set<string>();
  const queue = [from];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id) || !rooms[id]) continue;
    seen.add(id);
    for (const e of rooms[id].exits) queue.push(e.to);
  }
  return seen;
}
