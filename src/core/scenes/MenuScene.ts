import Phaser from 'phaser';
import { COLORS, FAN_NOTICE, GAME_HEIGHT, GAME_WIDTH, SCENES, TITLE_ART_KEY } from '../constants';

/** Title block sits in the painting's empty left third. */
const TITLE_X_WITH_ART = GAME_WIDTH * 0.26;
const TITLE_STROKE = 3;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    const hasArt = this.textures.exists(TITLE_ART_KEY);
    if (hasArt) this.add.image(0, 0, TITLE_ART_KEY).setOrigin(0, 0);
    const cx = hasArt ? TITLE_X_WITH_ART : GAME_WIDTH / 2;
    const stroke = { stroke: '#0b0a10', strokeThickness: TITLE_STROKE };
    this.add
      .text(cx, GAME_HEIGHT * 0.3, 'TRINITY BLOOD', { fontFamily: 'serif', fontSize: hasArt ? '24px' : '28px', color: COLORS.text, ...stroke })
      .setOrigin(0.5);
    this.add
      .text(cx, GAME_HEIGHT * 0.3 + 26, 'Requiem for Rome', { fontFamily: 'serif', fontSize: '14px', color: COLORS.text, ...stroke })
      .setOrigin(0.5);
    this.add
      .text(cx, GAME_HEIGHT * 0.3 + 44, 'a fan-made Metroidvania', {
        fontFamily: 'serif',
        fontSize: '10px',
        color: COLORS.textDim,
        ...stroke,
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, GAME_HEIGHT * 0.6, 'Tap to begin', { fontFamily: 'monospace', fontSize: '10px', color: COLORS.text, ...stroke })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 14, FAN_NOTICE, {
        fontFamily: 'sans-serif',
        fontSize: '8px',
        color: COLORS.text,
        ...stroke,
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
