import Phaser from 'phaser';
import type { Rect } from './types';

const DEPTH = 11;
const LINK = 5;
const CHAIN = 0x8a1424;
const SPIKE = 0xd4283e;
const BONE = 0xeadfc4;

/**
 * Draws the Crusnik's spiked chain while the lash is out: from his hand to the far end of the lash hitbox.
 * The reach is data (attacks.json 'lash' hitbox), so the drawing always matches what can be hit.
 */
export class ChainLashView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(DEPTH);
  }

  /** `box` is the active lash hitbox in world space, or null when the chain is not out. */
  update(box: Rect | null, handX: number, handY: number, facing: 1 | -1): void {
    const g = this.g;
    g.clear();
    if (!box) return;
    const tipX = facing > 0 ? box.x + box.w : box.x;
    const y = Math.round(box.y + box.h / 2);
    const from = Math.round(handX);
    const len = Math.abs(tipX - from);
    g.lineStyle(2, CHAIN, 1).lineBetween(from, handY, tipX, y);
    for (let d = LINK; d < len - 3; d += LINK) {
      const x = from + facing * d;
      const t = d / len;
      const ly = Math.round(handY + (y - handY) * t);
      // a hooked spike every link, alternating up and down
      const up = (d / LINK) % 2 === 0 ? -1 : 1;
      g.fillStyle(SPIKE, 1).fillRect(x, ly + (up < 0 ? -3 : 1), 1, 2);
    }
    // the bone-white barbed tip
    g.fillStyle(BONE, 1).fillTriangle(tipX, y, tipX - facing * 6, y - 3, tipX - facing * 6, y + 3);
  }
}
