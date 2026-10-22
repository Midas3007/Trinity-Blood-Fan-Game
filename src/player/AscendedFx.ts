import Phaser from 'phaser';
import type { AttackRunner } from '../combat/AttackRunner';

/** Behind the sprite: the lightning's glow. In front: the scythe's sweep and the bolt. */
const WING_DEPTH = 9.8;
const FRONT_DEPTH = 10.3;
const BLADE = 0xe85a5f;
const BLADE_CORE = 0xf39a8f;
const STAFF = 0x2e0811;
const BOLT = 0xbfe0ef;
const BOLT_CORE = 0xffffff;
const SCYTHE_REACH = 46;

/**
 * Abel at 100% (the Cain finale), drawn in code on top of his sprite (tools/sprites/crusnik100.py, which has the
 * bat wings and the double-sided scythe): the scythe's spin while ATK is active, and a lightning bolt out to the
 * reach of the ABIL attack's hitbox.
 */
export class AscendedFx {
  private readonly back: Phaser.GameObjects.Graphics;
  private readonly front: Phaser.GameObjects.Graphics;
  private t = 0;

  constructor(scene: Phaser.Scene) {
    this.back = scene.add.graphics().setDepth(WING_DEPTH);
    this.front = scene.add.graphics().setDepth(FRONT_DEPTH);
  }

  update(dtMs: number, x: number, y: number, facing: 1 | -1, combat: AttackRunner, alpha: number): void {
    this.t += dtMs;
    const f = this.front.clear().setAlpha(alpha);
    const glow = this.back.clear().setAlpha(alpha);
    const cur = combat.current;
    if (cur && cur.id === 'c100_scythe') this.scythe(f, x, y, facing, combat.elapsedMs / Math.max(1, cur.startupMs + cur.activeMs));
    if (cur && cur.id === 'c100_lightning' && combat.phase !== 'startup') {
      glow.fillStyle(BOLT, 0.18).fillCircle(x, y - 6, 22); // his hand lights up
      this.lightning(f, x + facing * 8, y - 6, facing, cur.hitbox.x + cur.hitbox.w / 2);
    }
  }

  /** The double-sided scythe, spun once round him: a staff with a crescent blade at each end. */
  private scythe(g: Phaser.GameObjects.Graphics, x: number, y: number, facing: 1 | -1, t: number): void {
    const ang = -Math.PI / 2 + facing * Math.min(1, t) * Math.PI * 2;
    const dx = Math.cos(ang) * SCYTHE_REACH, dy = Math.sin(ang) * SCYTHE_REACH * 0.6;
    g.lineStyle(2, STAFF, 1).lineBetween(x - dx, y - dy, x + dx, y + dy);
    for (const s of [1, -1]) {
      const ex = x + s * dx, ey = y + s * dy;
      const nx = -Math.sin(ang) * s * 12, ny = Math.cos(ang) * s * 7;
      g.fillStyle(BLADE, 1).fillTriangle(ex, ey, ex + nx, ey + ny, ex - s * dx * 0.25 + nx * 1.4, ey - s * dy * 0.25 + ny * 1.4);
      g.lineStyle(1, BLADE_CORE, 1).lineBetween(ex, ey, ex + nx, ey + ny);
    }
    g.lineStyle(1, BLADE, 0.35).strokeEllipse(x, y, SCYTHE_REACH * 2, SCYTHE_REACH * 1.2); // the arc it cuts
  }

  /** A jagged bolt straight ahead, re-drawn each frame so it crackles. */
  private lightning(g: Phaser.GameObjects.Graphics, x: number, y: number, facing: 1 | -1, reach: number): void {
    const steps = 9;
    let px = x, py = y;
    const pts: { x: number; y: number }[] = [{ x: px, y: py }];
    for (let i = 1; i <= steps; i++) {
      px = x + facing * (reach * i) / steps;
      py = y + (i === steps ? 0 : (Math.random() - 0.5) * 22);
      pts.push({ x: px, y: py });
    }
    for (const [w, c, a] of [[9, BOLT, 0.25], [4, BOLT, 0.9], [2, BOLT_CORE, 1]] as const) {
      g.lineStyle(w, c, a);
      for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1]!.x, pts[i - 1]!.y, pts[i]!.x, pts[i]!.y);
    }
    const k = pts[4]!;
    g.lineStyle(1, BOLT, 0.8).lineBetween(k.x, k.y, k.x + facing * 14, k.y + 12); // a fork
  }

  setVisible(on: boolean): void {
    this.back.setVisible(on);
    this.front.setVisible(on);
  }

  destroy(): void {
    this.back.destroy();
    this.front.destroy();
  }
}
