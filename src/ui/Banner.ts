import Phaser from 'phaser';
import { GAME_WIDTH } from '../core/constants';

const DEPTH = 1400;
const IN_MS = 400;
const OUT_MS = 700;

/** A big centred announcement with a smaller line under it, fading in and out (ability awakened, etc.). */
export class Banner {
  private readonly title: Phaser.GameObjects.Text;
  private readonly sub: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {
    const stroke = { stroke: '#0b0a10', strokeThickness: 4 };
    this.title = scene.add
      .text(GAME_WIDTH / 2, 92, '', { fontFamily: 'serif', fontSize: '20px', color: '#d4283e', ...stroke })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setAlpha(0);
    this.sub = scene.add
      .text(GAME_WIDTH / 2, 116, '', { fontFamily: 'serif', fontSize: '10px', color: '#eadfc4', align: 'center', ...stroke, strokeThickness: 3 })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setAlpha(0);
  }

  show(title: string, sub: string, holdMs = 3200): void {
    this.title.setText(title);
    this.sub.setText(sub);
    for (const t of [this.title, this.sub]) {
      this.scene.tweens.killTweensOf(t);
      t.setAlpha(0);
      this.scene.tweens.add({ targets: t, alpha: 1, duration: IN_MS });
      this.scene.tweens.add({ targets: t, alpha: 0, delay: IN_MS + holdMs, duration: OUT_MS });
    }
  }
}
