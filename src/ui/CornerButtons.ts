import Phaser from 'phaser';
import { GAME_WIDTH } from '../core/constants';

const DEPTH = 1600;
const R = 9;
const Y = 14;

/** Small MAP and PAUSE buttons in the top-right corner (kept clear of the action buttons). */
export class CornerButtons {
  constructor(scene: Phaser.Scene, onMap: () => void, onPause: () => void) {
    const make = (x: number, draw: (g: Phaser.GameObjects.Graphics) => void, onTap: () => void): void => {
      const c = scene.add.circle(x, Y, R, 0x241b2e, 0.8).setStrokeStyle(1, 0xc4a04a).setScrollFactor(0).setDepth(DEPTH);
      const g = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
      g.setPosition(x, Y);
      draw(g);
      c.setInteractive({ useHandCursor: true });
      c.on(Phaser.Input.Events.POINTER_DOWN, (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        onTap();
      });
    };
    // map: a folded parchment
    make(GAME_WIDTH - 40, (g) => {
      g.fillStyle(0xdcb39a, 1).fillRect(-5, -4, 10, 8);
      g.lineStyle(1, 0x7a4a1e, 1).lineBetween(-2, -4, -2, 4).lineBetween(2, -4, 2, 4);
    }, onMap);
    // pause: two bars
    make(GAME_WIDTH - 16, (g) => {
      g.fillStyle(0xddd7e6, 1).fillRect(-4, -4, 3, 8).fillRect(1, -4, 3, 8);
    }, onPause);
  }
}
