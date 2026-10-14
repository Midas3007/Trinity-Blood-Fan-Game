import Phaser from 'phaser';
import { COLORS } from '../core/constants';

const X = 8;
const Y = 8;
const W = 64;
const H = 5;

/** Placeholder HUD: player health bar (styled properly in Milestone 6). */
export class Hud {
  private readonly fill: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    scene.add
      .rectangle(X - 1, Y - 1, W + 2, H + 2, COLORS.background)
      .setOrigin(0)
      .setStrokeStyle(1, COLORS.stone)
      .setScrollFactor(0)
      .setDepth(900);
    this.fill = scene.add.rectangle(X, Y, W, H, COLORS.accent).setOrigin(0).setScrollFactor(0).setDepth(901);
  }

  setHealth(fraction: number): void {
    this.fill.width = W * Math.max(0, Math.min(1, fraction));
  }
}
