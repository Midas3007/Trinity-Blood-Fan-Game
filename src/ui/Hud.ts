import Phaser from 'phaser';

const DEPTH = 900;
const X = 8;
const Y = 6;
const PORTRAIT_R = 20;
const BAR_X = X + PORTRAIT_R * 2 + 6;
const HP_W = 78;
const HP_H = 5;
const CRUSNIK_W = 56;
const CRUSNIK_H = 3;
const FLASK_GAP = 7;
const GOLD = 0xc4a04a;
const GOLD_DARK = 0x7a4a1e;
const CRIMSON = 0xad2a3a;
const CRIMSON_DARK = 0x4a0f1b;
const BLUE = 0x7fb6d6;
const VOID = 0x0b0a10;

/**
 * Gothic HUD (top-left): Abel's portrait in a gilded ring, a framed crimson health bar with a lag trail,
 * the pale-blue Crusnik meter, and one vial per holy water flask.
 */
export class Hud {
  private readonly hp: Phaser.GameObjects.Rectangle;
  private readonly hpLag: Phaser.GameObjects.Rectangle;
  private readonly crusnik: Phaser.GameObjects.Rectangle;
  private readonly crusnikFrame: Phaser.GameObjects.Rectangle;
  private pulseMs = 0;
  private crusnikReady = false;
  private readonly vials: Phaser.GameObjects.Rectangle[] = [];
  private lag = 1;
  private target = 1;

  constructor(scene: Phaser.Scene, maxFlasks: number) {
    const fix = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T, d = 0): T => {
      o.setScrollFactor(0);
      o.setDepth(DEPTH + d);
      return o;
    };
    const cx = X + PORTRAIT_R;
    const cy = Y + PORTRAIT_R;
    // portrait: dark disc, Abel's face from his idle sprite, gilded ring
    fix(scene.add.circle(cx, cy, PORTRAIT_R, 0x241b2e));
    // Abel's face from the title painting (public/assets/ui/portrait.png, made by tools/portrait.py).
    if (scene.textures.exists('portrait')) fix(scene.add.image(cx, cy, 'portrait'), 1);
    fix(scene.add.circle(cx, cy, PORTRAIT_R).setStrokeStyle(2, GOLD), 2);
    fix(scene.add.circle(cx, cy, PORTRAIT_R + 2).setStrokeStyle(1, GOLD_DARK), 2);
    // health bar with frame and end caps
    const hy = Y + 5;
    fix(scene.add.rectangle(BAR_X - 2, hy - 2, HP_W + 4, HP_H + 4, VOID).setOrigin(0).setStrokeStyle(1, GOLD));
    fix(scene.add.rectangle(BAR_X, hy, HP_W, HP_H, CRIMSON_DARK).setOrigin(0), 1);
    this.hpLag = fix(scene.add.rectangle(BAR_X, hy, HP_W, HP_H, 0xe85a5f).setOrigin(0), 2);
    this.hp = fix(scene.add.rectangle(BAR_X, hy, HP_W, HP_H, CRIMSON).setOrigin(0), 3);
    fix(scene.add.rectangle(BAR_X, hy, HP_W, 1, 0xd4283e).setOrigin(0), 4);
    for (const ex of [BAR_X - 4, BAR_X + HP_W + 3]) fix(scene.add.rectangle(ex, hy + HP_H / 2, 3, 3, GOLD).setAngle(45), 5);
    // Crusnik meter (empty until the form is unlocked)
    const my = hy + HP_H + 4;
    this.crusnikFrame = fix(scene.add.rectangle(BAR_X - 1, my - 1, CRUSNIK_W + 2, CRUSNIK_H + 2, VOID).setOrigin(0).setStrokeStyle(1, GOLD_DARK));
    this.crusnik = fix(scene.add.rectangle(BAR_X, my, 0, CRUSNIK_H, BLUE).setOrigin(0), 1);
    // holy water vials
    this.vialY = my + CRUSNIK_H + 5;
    this.scene = scene;
    this.setMaxFlasks(maxFlasks);
  }

  private readonly scene: Phaser.Scene;
  private readonly vialY: number;

  /** One vial per flask; more appear when a relic raises the count. */
  setMaxFlasks(n: number): void {
    const vy = this.vialY;
    for (let i = this.vials.length; i < n; i++) {
      const vx = BAR_X + i * FLASK_GAP;
      const fix = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T, d: number): T => {
        o.setScrollFactor(0);
        o.setDepth(DEPTH + d);
        return o;
      };
      fix(this.scene.add.rectangle(vx + 2, vy, 2, 2, GOLD).setOrigin(0.5, 0), 1);
      fix(this.scene.add.rectangle(vx + 2, vy + 2, 5, 6, VOID).setOrigin(0.5, 0).setStrokeStyle(1, 0x8a8392), 0);
      this.vials.push(fix(this.scene.add.rectangle(vx + 2, vy + 4, 3, 4, 0xbfe0ef).setOrigin(0.5, 0), 1));
    }
  }

  setHealth(fraction: number): void {
    this.target = Phaser.Math.Clamp(fraction, 0, 1);
    this.hp.width = HP_W * this.target;
    if (this.target > this.lag) this.lag = this.target;
  }

  setFlasks(left: number): void {
    this.vials.forEach((v, i) => v.setVisible(i < left));
  }

  /** The blood meter: hidden until the form is awakened; the frame glows when ABIL can transform. */
  setCrusnik(fraction: number, awakened: boolean, ready: boolean): void {
    this.crusnik.width = CRUSNIK_W * Phaser.Math.Clamp(fraction, 0, 1);
    this.crusnik.setVisible(awakened);
    this.crusnikFrame.setVisible(awakened);
    this.crusnikReady = ready;
  }

  /** The pale trail behind the health bar drains after a hit. */
  update(dtMs: number): void {
    if (this.lag > this.target) this.lag = Math.max(this.target, this.lag - dtMs / 1500);
    this.hpLag.width = HP_W * this.lag;
    this.pulseMs += dtMs;
    const glow = this.crusnikReady && Math.floor(this.pulseMs / 250) % 2 === 0;
    this.crusnikFrame.setStrokeStyle(1, glow ? 0xeaf6ff : GOLD_DARK);
  }
}
