import Phaser from 'phaser';
import type { AttackRunner } from '../combat/AttackRunner';

/** Behind the sprite: the wings. In front: the scythe and the lightning. */
const WING_DEPTH = 9.8;
const FRONT_DEPTH = 10.3;
/** Wing beat: period (ms per radian), span (px) and how far a beat lifts the tips (px). */
const FLAP_PERIOD = 90;
const WING_SPAN = 34;
const WING_LIFT = 10;
/** Scalloped trailing edge: how many membrane panels per wing. */
const PANELS = 4;
const BONE = 0x0b0a10;
const MEMBRANE = 0x4a0f1b;
const MEMBRANE_EDGE = 0x8e1b2c;
const BLADE = 0xe85a5f;
const BLADE_CORE = 0xf39a8f;
const STAFF = 0x2e0811;
const BOLT = 0xbfe0ef;
const BOLT_CORE = 0xffffff;
const SCYTHE_REACH = 46;

/**
 * Abel at 100% (the Cain finale), drawn in code on top of the recoloured 80% sprite (tools/sprites/variants.py):
 * bat wings with bones and a scalloped membrane, a double-sided scythe that spins round him while ATK is active,
 * and a lightning bolt out to the reach of the ABIL attack's hitbox.
 */
export class AscendedFx {
  private readonly back: Phaser.GameObjects.Graphics;
  private readonly front: Phaser.GameObjects.Graphics;
  private t = 0;

  constructor(scene: Phaser.Scene) {
    this.back = scene.add.graphics().setDepth(WING_DEPTH);
    this.front = scene.add.graphics().setDepth(FRONT_DEPTH);
  }

  update(dtMs: number, x: number, y: number, facing: 1 | -1, flying: boolean, combat: AttackRunner, alpha: number): void {
    this.t += dtMs;
    const b = this.back.clear().setAlpha(alpha);
    const f = this.front.clear().setAlpha(alpha);
    // Faster beats in the air; folded and slow on the ground.
    const beat = Math.sin(this.t / (flying ? FLAP_PERIOD : FLAP_PERIOD * 3));
    const shoulderY = y - 8;
    for (const side of [-1, 1] as const) this.wing(b, x - facing * 3, shoulderY, side, beat, flying);
    const cur = combat.current;
    if (cur && cur.id === 'c100_scythe') this.scythe(f, x, y, facing, combat.elapsedMs / Math.max(1, cur.startupMs + cur.activeMs));
    if (cur && cur.id === 'c100_lightning' && combat.phase !== 'startup') this.lightning(f, x + facing * 8, y - 6, facing, cur.hitbox.x + cur.hitbox.w / 2);
  }

  /** One bat wing: three finger bones fanning out, membrane between them, scalloped at the bottom. */
  private wing(g: Phaser.GameObjects.Graphics, sx: number, sy: number, side: 1 | -1, beat: number, flying: boolean): void {
    const span = flying ? WING_SPAN : WING_SPAN * 0.55;
    const lift = beat * (flying ? WING_LIFT : 3);
    const tips: { x: number; y: number }[] = [];
    for (let i = 0; i <= PANELS; i++) {
      const a = (-0.9 + (i / PANELS) * 1.5) + (flying ? 0 : 0.5);
      const len = span * (1 - i * 0.12);
      tips.push({ x: sx + side * Math.cos(a) * len, y: sy + Math.sin(a) * len - lift * (1 - i / PANELS) });
    }
    // Membrane: a fan from the shoulder; each panel's lower edge bows up (the scallops).
    g.fillStyle(MEMBRANE, 0.92);
    for (let i = 0; i < PANELS; i++) {
      const p = tips[i]!, q = tips[i + 1]!;
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      const inward = { x: sx + (mx - sx) * 0.72, y: sy + (my - sy) * 0.72 };
      g.fillTriangle(sx, sy, p.x, p.y, inward.x, inward.y);
      g.fillTriangle(sx, sy, inward.x, inward.y, q.x, q.y);
      g.lineStyle(1, MEMBRANE_EDGE, 0.9).lineBetween(p.x, p.y, inward.x, inward.y).lineBetween(inward.x, inward.y, q.x, q.y);
    }
    g.lineStyle(2, BONE, 1);
    for (let i = 0; i < PANELS; i += 2) g.lineBetween(sx, sy, tips[i]!.x, tips[i]!.y);
    g.lineStyle(1, BONE, 1).lineBetween(sx, sy, tips[PANELS]!.x, tips[PANELS]!.y);
    g.fillStyle(BONE, 1).fillTriangle(tips[0]!.x, tips[0]!.y, tips[0]!.x + side * 4, tips[0]!.y - 3, tips[0]!.x + side * 1, tips[0]!.y + 3); // claw
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
      py = y + (i === steps ? 0 : (Math.random() - 0.5) * 14);
      pts.push({ x: px, y: py });
    }
    for (const [w, c, a] of [[5, BOLT, 0.3], [2, BOLT, 1], [1, BOLT_CORE, 1]] as const) {
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
