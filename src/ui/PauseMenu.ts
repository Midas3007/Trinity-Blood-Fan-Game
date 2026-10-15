import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../core/constants';

const DEPTH = 1500;

/** Pause panel: resume or return to the title screen. */
export class PauseMenu {
  private readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, onResume: () => void, onTitle: () => void) {
    const bg = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0a10, 0.85).setOrigin(0);
    const title = scene.add.text(GAME_WIDTH / 2, 70, 'PAUSED', { fontFamily: 'serif', fontSize: '18px', color: COLORS.text }).setOrigin(0.5);
    const item = (y: number, text: string, act: () => void): Phaser.GameObjects.Text => {
      const t = scene.add
        .text(GAME_WIDTH / 2, y, text, { fontFamily: 'serif', fontSize: '12px', color: COLORS.text, backgroundColor: '#241b2e', padding: { x: 10, y: 4 } })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on(Phaser.Input.Events.POINTER_DOWN, (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        act();
      });
      return t;
    };
    this.container = scene.add
      .container(0, 0, [bg, title, item(120, 'Resume', onResume), item(150, 'Return to title', onTitle)])
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);
  }

  get open(): boolean {
    return this.container.visible;
  }

  show(): void {
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }
}
