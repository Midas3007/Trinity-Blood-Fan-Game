import Phaser from 'phaser';
import { COLORS, FAN_NOTICE, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../constants';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, GAME_HEIGHT * 0.3, 'TRINITY BLOOD', { fontFamily: 'serif', fontSize: '28px', color: COLORS.text })
      .setOrigin(0.5);
    this.add
      .text(cx, GAME_HEIGHT * 0.3 + 26, 'a fan-made Metroidvania', {
        fontFamily: 'serif',
        fontSize: '11px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, GAME_HEIGHT * 0.6, 'Tap to begin', { fontFamily: 'monospace', fontSize: '10px', color: COLORS.text })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });

    this.add
      .text(cx, GAME_HEIGHT - 14, FAN_NOTICE, {
        fontFamily: 'sans-serif',
        fontSize: '8px',
        color: COLORS.textDim,
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 24 },
      })
      .setOrigin(0.5, 1);

    const start = (): void => {
      // Fullscreen needs a user gesture; ignore failures (e.g. iOS Safari does not support it).
      if (!this.scale.isFullscreen && this.sys.game.device.fullscreen.available) {
        try {
          this.scale.startFullscreen();
        } catch {
          /* not allowed on this browser */
        }
      }
      this.scene.start(SCENES.play);
    };
    this.input.once(Phaser.Input.Events.POINTER_UP, start);
    this.input.keyboard?.once('keydown', start);
  }
}
