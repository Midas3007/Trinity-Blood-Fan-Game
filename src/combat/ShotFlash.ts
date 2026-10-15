import Phaser from 'phaser';

/** A one-shot muzzle flash and tracer line from the gun to the target. One instance, reused. */
export class ShotFlash {
  private readonly g: Phaser.GameObjects.Graphics;
  private remainingMs = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly color: number,
    private readonly flashMs: number,
  ) {
    this.g = scene.add.graphics().setDepth(20).setVisible(false);
  }

  fire(fromX: number, fromY: number, toX: number, toY: number): void {
    this.g.clear();
    this.g.lineStyle(1, this.color, 1).lineBetween(fromX, fromY, toX, toY);
    this.g.fillStyle(this.color, 1).fillCircle(fromX, fromY, 3);
    this.g.setVisible(true);
    this.remainingMs = this.flashMs;
  }

  update(dtMs: number): void {
    if (this.remainingMs <= 0) return;
    this.remainingMs -= dtMs;
    if (this.remainingMs <= 0) this.g.setVisible(false);
  }
}
