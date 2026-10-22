import Phaser from 'phaser';
import { items, type ItemDef } from '../systems/items';

const DEPTH = 8.5;
const REACH = 14;
const BOB_PX = 2;
const BOB_MS = 900;
const GOLD = 0xe8c86a;

/**
 * Hidden items lying in a room (drawn in code: a glowing reliquary light with the item's shape in it). Walk into one
 * to take it. Items already found are not drawn.
 */
export class ItemPickups {
  private readonly shown: { id: string; x: number; y: number; parts: Phaser.GameObjects.GameObject[] }[] = [];
  private t = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    list: readonly { id: string; x: number; y: number }[],
    found: (id: string) => boolean,
  ) {
    for (const it of list) {
      const def = items[it.id];
      if (!def || found(it.id)) continue;
      this.shown.push({ id: it.id, x: it.x, y: it.y - 10, parts: this.draw(def, it.x, it.y - 10) });
    }
  }

  private draw(def: ItemDef, x: number, y: number): Phaser.GameObjects.GameObject[] {
    const s = this.scene;
    const glow = s.add.circle(x, y, 10, GOLD, 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH);
    const core = s.add.circle(x, y, 5, GOLD, 0.25).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH);
    const g = s.add.graphics().setDepth(DEPTH + 0.1).setPosition(x, y);
    switch (def.kind) {
      case 'weapon': // a sword, point down
        g.fillStyle(0xddd7e6, 1).fillRect(-0.5, -7, 1, 11);
        g.fillStyle(GOLD, 1).fillRect(-3, -4, 6, 1).fillRect(-0.5, -7, 1, 3);
        break;
      case 'heart':
        g.fillStyle(0xd4283e, 1).fillCircle(-1.5, -1, 2).fillCircle(1.5, -1, 2).fillTriangle(-3.5, 0, 3.5, 0, 0, 4);
        g.fillStyle(0xddd7e6, 1).fillRect(-0.5, -5, 1, 3);
        break;
      case 'chalice':
        g.fillStyle(0xc9c2d6, 1).fillTriangle(-3, -4, 3, -4, 0, 0).fillRect(-0.5, 0, 1, 3).fillRect(-2, 3, 4, 1);
        break;
      case 'porcelain': // the Byzantine tea service: blue and white
        g.fillStyle(0xefeaf2, 1).fillEllipse(0, 0, 7, 5);
        g.fillStyle(0x4f7c9e, 1).fillRect(-2, -1, 4, 1).fillRect(-1, 1, 2, 1);
        break;
      case 'tea':
        g.fillStyle(0x6a1524, 1).fillRect(-2.5, -3, 5, 6);
        g.fillStyle(GOLD, 1).fillRect(-2.5, -3, 5, 1).fillRect(-1, 0, 2, 1);
        break;
    }
    s.tweens.add({ targets: [glow], scale: 1.4, alpha: 0.5, duration: BOB_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return [glow, core, g];
  }

  update(dtMs: number): void {
    this.t += dtMs;
    const dy = Math.sin((this.t / BOB_MS) * Math.PI) * BOB_PX;
    for (const it of this.shown) for (const p of it.parts) (p as unknown as Phaser.GameObjects.Components.Transform).y = it.y + dy;
  }

  /** The item Abel is touching (removed from the room), or null. */
  take(px: number, py: number): string | null {
    const i = this.shown.findIndex((it) => Math.abs(it.x - px) <= REACH && Math.abs(it.y - py) <= REACH + 12);
    if (i < 0) return null;
    const [it] = this.shown.splice(i, 1);
    for (const p of it!.parts) {
      this.scene.tweens.add({ targets: p, alpha: 0, scale: 2, duration: 400, onComplete: () => p.destroy() });
    }
    return it!.id;
  }

  /** For the bot and the debug snapshot. */
  get remaining(): { id: string; x: number; y: number }[] {
    return this.shown.map(({ id, x, y }) => ({ id, x, y }));
  }
}
