import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';

const DEPTH = 1100;
const W = 240;
const H = 5;
const Y = GAME_HEIGHT - 26;
const GOLD = 0xc4a04a;
const CRIMSON = 0xa3122a;

/** The boss's name and a long health bar along the bottom of the screen (Blasphemous-style). */
export class BossBar {
  private readonly parts: Phaser.GameObjects.Components.Visible[] = [];
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly lag: Phaser.GameObjects.Rectangle;
  private target = 1;
  private lagFraction = 1;

  constructor(scene: Phaser.Scene, name: string) {
    const x = (GAME_WIDTH - W) / 2;
    const fix = <T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth & Phaser.GameObjects.Components.Visible>(o: T, d = 0): T => {
      o.setScrollFactor(0).setDepth(DEPTH + d).setVisible(false);
      this.parts.push(o);
      return o;
    };
    fix(scene.add.text(GAME_WIDTH / 2, Y - 3, name, { fontFamily: 'serif', fontSize: '10px', color: '#eadfc4', stroke: '#0b0a10', strokeThickness: 3 }).setOrigin(0.5, 1));
    fix(scene.add.rectangle(x - 2, Y - 2, W + 4, H + 4, 0x0b0a10).setOrigin(0).setStrokeStyle(1, GOLD));
    this.lag = fix(scene.add.rectangle(x, Y, W, H, 0xe85a5f).setOrigin(0), 1);
    this.fill = fix(scene.add.rectangle(x, Y, W, H, CRIMSON).setOrigin(0), 2);
    for (const ex of [x - 5, x + W + 4]) fix(scene.add.rectangle(ex, Y + H / 2, 4, 4, GOLD).setAngle(45), 3);
  }

  show(on: boolean): void {
    for (const p of this.parts) p.setVisible(on);
  }

  set(fraction: number): void {
    this.target = Phaser.Math.Clamp(fraction, 0, 1);
    this.fill.width = W * this.target;
  }

  update(dtMs: number): void {
    if (this.lagFraction > this.target) this.lagFraction = Math.max(this.target, this.lagFraction - dtMs / 1200);
    this.lag.width = W * this.lagFraction;
  }
}
