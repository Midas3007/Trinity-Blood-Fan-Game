import type Phaser from 'phaser';

/** The on-screen controls' look (owner: "more stylized and on brand"): gothic medallions in the game's palette. */
export const ART = {
  plate: 0x14111c,
  platePressed: 0x6a1626,
  gold: 0xc4a04a,
  goldDark: 0x6e5222,
  goldLight: 0xf0ce6e,
  steel: 0xddd7e6,
  steelDark: 0x8a8392,
  crimson: 0xd4283e,
  wine: 0x8e1b2c,
  holy: 0x7fb6d6,
  ink: 0x0b0a10,
} as const;

/** How see-through the controls are at rest and while held. */
const IDLE = { plate: 0.5, ring: 0.8, icon: 0.85 };
const HELD = { plate: 0.85, ring: 1, icon: 1 };

/** A medallion: a dark plate in a double gold ring with four studs, the action's icon, crimson while held. */
export function drawMedallion(g: Phaser.GameObjects.Graphics, r: number, action: string, held: boolean): void {
  const a = held ? HELD : IDLE;
  g.clear();
  if (held) g.fillStyle(ART.goldLight, 0.18).fillCircle(0, 0, r + 4);          // a glow round it
  g.fillStyle(held ? ART.platePressed : ART.plate, a.plate).fillCircle(0, 0, r);
  g.lineStyle(2, ART.gold, a.ring).strokeCircle(0, 0, r - 1);
  g.lineStyle(1, ART.goldDark, a.ring).strokeCircle(0, 0, r - 4);
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {      // studs at the four points
    const sx = dx * (r - 1), sy = dy * (r - 1);
    g.fillStyle(ART.ink, a.ring).fillTriangle(sx - 3, sy, sx, sy - 3, sx + 3, sy).fillTriangle(sx - 3, sy, sx, sy + 3, sx + 3, sy);
    g.fillStyle(ART.goldLight, a.ring).fillTriangle(sx - 2, sy, sx, sy - 2, sx + 2, sy).fillTriangle(sx - 2, sy, sx, sy + 2, sx + 2, sy);
  }
  drawIcon(g, action, r / 24, -r * 0.2, a.icon);
}

/** The icon for an action, centred at (0, cy), drawn at scale s (1 = a 20 px button). */
export function drawIcon(g: Phaser.GameObjects.Graphics, action: string, s: number, cy: number, alpha = 1): void {
  const P = (x: number, y: number): [number, number] => [x * s, cy + y * s];
  const line = (w: number, c: number, x1: number, y1: number, x2: number, y2: number): void => {
    const [ax, ay] = P(x1, y1), [bx, by] = P(x2, y2);
    g.lineStyle(Math.max(1, w * s), c, alpha).lineBetween(ax, ay, bx, by);
  };
  const tri = (c: number, pts: [number, number][]): void => {
    const q = pts.map(([x, y]) => P(x, y));
    g.fillStyle(c, alpha).fillTriangle(q[0]![0], q[0]![1], q[1]![0], q[1]![1], q[2]![0], q[2]![1]);
  };
  const dot = (c: number, x: number, y: number, rr: number): void => {
    const [px, py] = P(x, y);
    g.fillStyle(c, alpha).fillCircle(px, py, rr * s);
  };
  switch (action) {
    case 'attack': // a sword, point up and right, gold guard
      line(3, ART.ink, -7, 7, 7, -7);
      line(2, ART.steel, -6, 6, 7, -7);
      line(2, ART.gold, -8, 1, -1, 8);
      dot(ART.gold, -7, 7, 1.6);
      break;
    case 'jump': // a pair of wings rising
      for (const side of [-1, 1]) {
        tri(ART.ink, [[side * 1, 4], [side * 9, -7], [side * 8, 3]]);
        tri(ART.steel, [[side * 1.5, 3], [side * 8, -5], [side * 7, 2]]);
        line(1, ART.steelDark, side * 2, 2, side * 7, -1);
      }
      tri(ART.gold, [[-2, -3], [2, -3], [0, -8]]);
      break;
    case 'dodge': // a dash: speed lines and an arrow
      for (const [y, x0] of [[-4, -8], [0, -9], [4, -8]] as const) line(1.5, ART.steelDark, x0, y, 1, y);
      tri(ART.steel, [[0, -6], [0, 6], [8, 0]]);
      break;
    case 'ability': // a drop of blood (the Crusnik)
      tri(ART.wine, [[-5, 1], [5, 1], [0, -9]]);
      dot(ART.wine, 0, 2, 5.5);
      tri(ART.crimson, [[-4, 1], [4, 1], [0, -7]]);
      dot(ART.crimson, 0, 2, 4.5);
      dot(ART.steel, -1.8, 1, 1.2);
      break;
    case 'heal': // a flask of holy water with a gold cross
      line(5, ART.ink, 0, -8, 0, -5);
      dot(ART.ink, 0, 2, 7);
      dot(ART.holy, 0, 2, 6);
      line(3, ART.steel, 0, -8, 0, -4);
      line(1.5, ART.gold, 0, -1, 0, 6);
      line(1.5, ART.gold, -2.5, 1.5, 2.5, 1.5);
      break;
    case 'parry': // a shield with a crimson cross
      tri(ART.gold, [[-7, -7], [7, -7], [0, 9]]);
      g.fillStyle(ART.gold, alpha).fillRect(-7 * s, cy - 7 * s, 14 * s, 6 * s);
      tri(ART.plate, [[-5, -5], [5, -5], [0, 6]]);
      g.fillStyle(ART.plate, alpha).fillRect(-5 * s, cy - 5 * s, 10 * s, 4 * s);
      line(2, ART.crimson, 0, -4, 0, 5);
      line(2, ART.crimson, -4, -2, 4, -2);
      break;
    default:
      dot(ART.gold, 0, 0, 3);
  }
}

/** The stick's base: a faint plate in a double gold ring, notched at the four directions. */
export function drawStickBase(g: Phaser.GameObjects.Graphics, r: number): void {
  g.clear();
  g.fillStyle(ART.plate, 0.28).fillCircle(0, 0, r);
  g.lineStyle(2, ART.gold, 0.6).strokeCircle(0, 0, r - 1);
  g.lineStyle(1, ART.goldDark, 0.6).strokeCircle(0, 0, r - 5);
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
    const tx = dx * (r - 9), ty = dy * (r - 9);
    g.fillStyle(ART.gold, 0.7).fillTriangle(tx + dx * 5, ty + dy * 5, tx - dy * 3, ty + dx * 3, tx + dy * 3, ty - dx * 3);
  }
}

/** The knob: a dark disc in a gold rim with a crimson gem; brighter while held. */
export function drawKnob(g: Phaser.GameObjects.Graphics, r: number, held: boolean): void {
  const a = held ? 1 : 0.75;
  g.clear();
  g.fillStyle(held ? ART.platePressed : ART.plate, held ? 0.9 : 0.6).fillCircle(0, 0, r);
  g.lineStyle(2, ART.gold, a).strokeCircle(0, 0, r - 1);
  g.fillStyle(ART.wine, a).fillCircle(0, 0, r * 0.38);
  g.fillStyle(ART.crimson, a).fillCircle(0, 0, r * 0.28);
  g.fillStyle(ART.steel, a).fillCircle(-r * 0.12, -r * 0.12, Math.max(1, r * 0.08));
}
