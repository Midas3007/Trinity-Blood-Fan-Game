import { TILE, tileKind, type RoomData } from './tiled';

/**
 * Can Abel walk through a room? (Owner bug, 2026-10-23: the Lamp Market's tower blocked the street, with its ladder on
 * the far side.) A coarse model on the tile grid: Abel is two tiles tall; he walks, steps up one tile, jumps up to
 * JUMP_UP tiles high (LEDGE_UP up a wall face he can catch) or JUMP_ACROSS tiles across, falls any distance, drops through one-way platforms and climbs ladders. Gates and grilles count as open
 * (they open as the story goes on). Pure; used by tests.
 */
const JUMP_UP = 4;
const LEDGE_UP = 5; // a wall face one tile taller than his jump: he catches the lip and pulls up (player.json ledge*)
const JUMP_ACROSS = 7; // columns from take-off to landing: a 6-tile gap. 0.68 s in the air at 120 px/s is ~82 px, plus his 16 px body

type Cell = number; // row * cols + col

export function walkGraph(r: RoomData): { stand(c: number, y: number): boolean; open(c: number, y: number): boolean; reach(from: Cell): Set<Cell>; standCell(px: number, feetY: number): Cell | null } {
  const { cols, rows } = r;
  const kind = (c: number, y: number): string => (c < 0 || c >= cols || y < 0 || y >= rows ? 'none' : tileKind(r.layers.terrain[y * cols + c] ?? 0));
  const inRect = (c: number, y: number, rs: { x: number; y: number; w: number; h: number }[]): boolean =>
    rs.some((q) => c * TILE + TILE / 2 >= q.x && c * TILE + TILE / 2 < q.x + q.w && y * TILE + TILE / 2 >= q.y && y * TILE + TILE / 2 < q.y + q.h);
  const solid = (c: number, y: number): boolean => kind(c, y) === 'solid' && !inRect(c, y, r.gates);
  const ladder = (c: number, y: number): boolean => inRect(c, y, r.ladders);
  const open = (c: number, y: number): boolean => c >= 0 && c < cols && y >= 0 && y < rows && !solid(c, y);
  const floorAt = (c: number, y: number): boolean => y + 1 >= rows || solid(c, y + 1) || kind(c, y + 1) === 'oneway' || ladder(c, y + 1);
  const stand = (c: number, y: number): boolean => open(c, y) && open(c, y - 1) && (floorAt(c, y) || ladder(c, y));
  const id = (c: number, y: number): Cell => y * cols + c;
  const clearUp = (c: number, from: number, to: number): boolean => {
    for (let y = from - 1; y >= to - 1; y--) if (!open(c, y)) return false;
    return true;
  };
  const neighbours = (c: number, y: number): [number, number][] => {
    const out: [number, number][] = [];
    if (ladder(c, y) || ladder(c, y + 1)) {
      for (const dy of [-1, 1]) if (stand(c, y + dy) || (open(c, y + dy) && ladder(c, y + dy))) out.push([c, y + dy]);
      if (ladder(c, y) && open(c, y - 1) && open(c, y - 2)) out.push([c, y - 1]);
    }
    for (const dx of [-1, 1]) {
      // walk, or step up a stair
      if (stand(c + dx, y)) out.push([c + dx, y]);
      if (stand(c + dx, y - 1) && open(c, y - 2)) out.push([c + dx, y - 1]);
      // walk off an edge and fall to the first floor below
      if (open(c + dx, y) && open(c + dx, y - 1) && !floorAt(c + dx, y)) {
        let fy = y;
        while (fy + 1 < rows && open(c + dx, fy + 1) && !floorAt(c + dx, fy)) fy++;
        if (stand(c + dx, fy)) out.push([c + dx, fy]);
      }
      // catch a ledge: the next column is a wall whose top is just out of a plain jump's reach
      for (let h = JUMP_UP + 1; h <= LEDGE_UP; h++) {
        if (!clearUp(c, y, y - h - 1)) break;
        if (solid(c + dx, y - h + 1) && stand(c + dx, y - h)) out.push([c + dx, y - h]);
      }
      // jump: up to JUMP_UP tiles higher, up to JUMP_ACROSS across, or any distance lower
      for (let d = 1; d <= JUMP_ACROSS; d++) {
        const tc = c + dx * d;
        for (let ty = Math.max(1, y - JUMP_UP); ty < rows; ty++) {
          if (!stand(tc, ty)) continue;
          const top = Math.min(ty, y) - 1;
          if (!clearUp(c, y, Math.max(1, Math.min(y, ty) - 1))) continue;
          let ok = true;
          for (let k = 1; k <= d && ok; k++) if (!open(c + dx * k, top) || !open(c + dx * k, top - 1)) ok = false;
          if (ok) out.push([tc, ty]);
          break; // the first floor in that column is where he lands
        }
      }
    }
    // down + jump drops through a one-way platform, to the first floor (or ladder) below
    if (kind(c, y + 1) === 'oneway') {
      let fy = y + 1;
      while (fy + 1 < rows && open(c, fy + 1) && !floorAt(c, fy)) fy++;
      if (stand(c, fy)) out.push([c, fy]);
    }
    // straight up through one-way platforms
    for (let ty = y - 1; ty >= Math.max(1, y - JUMP_UP); ty--) {
      if (!open(c, ty - 1)) break;
      if (stand(c, ty) && kind(c, ty + 1) === 'oneway') out.push([c, ty]);
    }
    return out;
  };
  return {
    stand: (c: number, y: number) => stand(c, y),
    open: (c: number, y: number) => open(c, y),
    reach(from: Cell): Set<Cell> {
      const seen = new Set<Cell>([from]);
      const queue = [from];
      while (queue.length) {
        const cur = queue.pop()!;
        const c = cur % cols, y = Math.floor(cur / cols);
        for (const [nc, ny] of neighbours(c, y)) {
          const n = id(nc, ny);
          if (!seen.has(n)) {
            seen.add(n);
            queue.push(n);
          }
        }
      }
      return seen;
    },
    standCell(px: number, feetY: number): Cell | null {
      const c = Math.max(0, Math.min(cols - 1, Math.floor(px / TILE)));
      const y0 = Math.max(0, Math.min(rows - 1, Math.ceil(feetY / TILE) - 1));
      for (let y = y0; y >= Math.max(0, y0 - 3); y--) if (stand(c, y)) return id(c, y);
      for (let y = y0; y < Math.min(rows, y0 + 4); y++) if (stand(c, y)) return id(c, y);
      return null;
    },
  };
}

/** Ways in and out of a room that cannot be walked between (empty when every exit is reachable from every way in). */
export function walkProblems(r: RoomData): string[] {
  const g = walkGraph(r);
  const spots: { name: string; cells: number[]; edge?: boolean }[] = [];
  for (const [name, e] of Object.entries(r.entries)) {
    const s = g.standCell(e.x, e.y);
    if (s !== null) spots.push({ name: `entry ${name}`, cells: [s] });
  }
  for (const ex of r.exits) {
    const cells: number[] = [];
    for (let x = ex.x + 4; x < ex.x + ex.w; x += TILE) for (let y = ex.y + TILE; y <= ex.y + ex.h + TILE; y += TILE) {
      const s = g.standCell(x, y);
      if (s !== null && !cells.includes(s)) cells.push(s);
    }
    if (cells.length) spots.push({ name: `exit to ${ex.to}`, cells });
  }
  // open edges: rooms join by walking (or climbing, or falling) off them; each run of open cells is one way in and out
  const edge = (name: string, cells: [number, number][]): void => {
    let run: number[] = [];
    const flush = (): void => {
      if (run.length) spots.push({ name, cells: run, edge: true });
      run = [];
    };
    for (const [c, y] of cells) {
      if (g.stand(c, y)) run.push(y * r.cols + c);
      else if (!g.open(c, y)) flush();
    }
    flush();
  };
  edge('west edge', Array.from({ length: r.rows }, (_, y) => [0, y] as [number, number]));
  edge('east edge', Array.from({ length: r.rows }, (_, y) => [r.cols - 1, y] as [number, number]));
  const out: string[] = [];
  for (const a of spots) {
    const seen = new Set<number>();
    for (const c of a.cells) for (const n of g.reach(c)) seen.add(n);
    for (const b of spots) if (b !== a && !b.cells.some((c) => seen.has(c))) out.push(`${r.id}: ${a.name} cannot reach ${b.name}`);
  }
  return out;
}
