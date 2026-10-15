import Phaser from 'phaser';
import { COLORS, FAN_NOTICE, GAME_HEIGHT, GAME_WIDTH, SCENES, TITLE_ART_KEY } from '../constants';
import { gameState } from '../../systems/GameState';
import { saveStore } from '../../systems/save/SaveStore';
import { GothicButton } from '../../ui/GothicButton';
import { gameProgress } from '../../systems/gameProgress';

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
      .text(cx, GAME_HEIGHT * 0.3 + 26, 'The Star of Sorrow', { fontFamily: 'serif', fontSize: '14px', color: COLORS.text, ...stroke })
      .setOrigin(0.5);
    this.add
      .text(cx, GAME_HEIGHT * 0.3 + 44, 'a fan-made Metroidvania', {
        fontFamily: 'serif',
        fontSize: '10px',
        color: COLORS.textDim,
        ...stroke,
      })
      .setOrigin(0.5);

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

    const save = saveStore.load();
    const begin = (fresh: boolean): void => {
      // Fullscreen needs a user gesture; ignore failures (e.g. iOS Safari does not support it).
      if (!this.scale.isFullscreen && this.sys.game.device.fullscreen.available) {
        try {
          this.scale.startFullscreen();
        } catch {
          /* not allowed on this browser */
        }
      }
      if (fresh) saveStore.clear();
      gameState.load(fresh ? null : save);
      const cp = gameState.checkpoint;
      // No checkpoint: PlayScene starts at the beginning of the game (or the ?test room).
      this.scene.start(SCENES.play, cp ? { room: cp.room, checkpoint: cp.id } : undefined);
    };

    const itemStyle = { fontFamily: 'serif', fontSize: '12px', color: COLORS.text, ...stroke };
    if (!save) {
      const prompt = this.add.text(cx, GAME_HEIGHT * 0.6, 'Tap to begin', { ...itemStyle, fontFamily: 'monospace', fontSize: '10px' }).setOrigin(0.5);
      this.tweens.add({ targets: prompt, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
      this.input.once(Phaser.Input.Events.POINTER_UP, () => begin(true));
      this.input.keyboard?.once('keydown', () => begin(true));
      return;
    }
    // A save exists: Continue (with how far it has gone), or New game (tap twice, so a stray tap never wipes progress).
    const pct = Math.round(gameProgress(save) * 100);
    new GothicButton(this, cx, GAME_HEIGHT * 0.6, `Continue  ·  ${pct}%`, () => begin(false), 120, 22);
    const barW = 104;
    const barY = GAME_HEIGHT * 0.6 + 14;
    this.add.rectangle(cx - barW / 2, barY, barW, 3, 0x0b0a10).setOrigin(0, 0.5).setStrokeStyle(1, 0x6e5222);
    this.add.rectangle(cx - barW / 2, barY, Math.max(1, (barW * pct) / 100), 3, 0xc4a04a).setOrigin(0, 0.5);
    let armed = false;
    const fresh: GothicButton = new GothicButton(this, cx, GAME_HEIGHT * 0.6 + 34, 'New game', () => {
      if (armed) return begin(true);
      armed = true;
      fresh.setText('Tap again to erase');
    }, 120, 22);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') begin(false);
      if (e.key.toLowerCase() === 'n') begin(true);
    });
  }
}
