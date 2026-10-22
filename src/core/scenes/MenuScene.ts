import Phaser from 'phaser';
import { audio } from '../../systems/audio/AudioManager';
import { music } from '../../systems/audio/music';
import { COLORS, FAN_NOTICE, GAME_HEIGHT, GAME_WIDTH, SCENES, TITLE_ART_KEY, TITLE_FONT } from '../constants';
import { gameState } from '../../systems/GameState';
import { saveStore, SLOTS } from '../../systems/save/SaveStore';
import { rooms } from '../../world/rooms';
import { GothicButton } from '../../ui/GothicButton';
import { gameProgress } from '../../systems/gameProgress';

/** Title block sits in the painting's empty left third. */
const TITLE_X_WITH_ART = GAME_WIDTH * 0.26;
const TITLE_STROKE = 3;
/** The lettering is drawn at this many times the game's pixels, so its curves stay smooth when the screen scales up. */
const TITLE_TEXT_RES = 4;
const ROMAN = ['I', 'II', 'III'];

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    audio.music(music.menu);
    const hasArt = this.textures.exists(TITLE_ART_KEY);
    if (hasArt) this.add.image(0, 0, TITLE_ART_KEY).setOrigin(0, 0);
    const cx = hasArt ? TITLE_X_WITH_ART : GAME_WIDTH / 2;
    const stroke = { stroke: '#0b0a10', strokeThickness: TITLE_STROKE };
    this.add
      .text(cx, GAME_HEIGHT * 0.3, 'Trinity Blood', { fontFamily: TITLE_FONT, fontSize: hasArt ? '32px' : '36px', color: COLORS.text, ...stroke })
      .setOrigin(0.5)
      .setResolution(TITLE_TEXT_RES);
    this.add
      .text(cx, GAME_HEIGHT * 0.3 + 28, 'The Star of Sorrow', { fontFamily: TITLE_FONT, fontSize: '16px', color: COLORS.text, ...stroke })
      .setOrigin(0.5)
      .setResolution(TITLE_TEXT_RES);
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

    const begin = (slot: number, fresh: boolean): void => {
      // Fullscreen needs a user gesture; ignore failures (e.g. iOS Safari does not support it).
      if (!this.scale.isFullscreen && this.sys.game.device.fullscreen.available) {
        try {
          this.scale.startFullscreen();
        } catch {
          /* not allowed on this browser */
        }
      }
      saveStore.useSlot(slot);
      if (fresh) saveStore.clear(slot);
      gameState.load(fresh ? null : saveStore.load(slot));
      const cp = gameState.checkpoint;
      // No checkpoint: PlayScene starts at the beginning of the game (or the ?test room). Always pass data: Phaser
      // keeps the previous start data when given none, which put a new game back where the last one left off.
      this.scene.start(SCENES.play, cp ? { room: cp.room, checkpoint: cp.id } : {});
    };

    const itemStyle = { fontFamily: 'serif', fontSize: '12px', color: COLORS.text, ...stroke };
    if (!saveStore.anySave()) {
      const prompt = this.add.text(cx, GAME_HEIGHT * 0.6, 'Tap to begin', { ...itemStyle, fontFamily: 'monospace', fontSize: '10px' }).setOrigin(0.5);
      this.tweens.add({ targets: prompt, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
      this.input.once(Phaser.Input.Events.POINTER_UP, () => begin(1, true));
      this.input.keyboard?.once('keydown', () => begin(1, true));
      return;
    }
    // Save slots (owner): each shows how far it has gone and where; an empty slot starts a new game. Erase asks twice.
    let erasing = false;
    let armed = 0;
    const slotButtons: GothicButton[] = [];
    const label = (i: number): string => {
      const d = saveStore.load(i);
      if (!d) return `${ROMAN[i - 1]}  ·  new game`;
      const place = d.checkpoint ? (rooms[d.checkpoint.room]?.title ?? '') : 'Istvan';
      return `${ROMAN[i - 1]}  ·  ${Math.round(gameProgress(d) * 100)}%  ·  ${place}`;
    };
    const refresh = (): void => {
      for (let i = 1; i <= SLOTS; i++) {
        const b = slotButtons[i - 1];
        if (!b) continue;
        b.setText(erasing && saveStore.load(i) ? (armed === i ? 'Tap again to erase' : `Erase ${label(i)}`) : label(i));
      }
    };
    const top = GAME_HEIGHT * 0.53;
    for (let i = 1; i <= SLOTS; i++) {
      const y = top + (i - 1) * 27;
      const b = new GothicButton(this, cx, y, label(i), () => {
        const has = saveStore.load(i) !== null;
        if (!erasing) return begin(i, !has);
        if (!has) return;
        if (armed !== i) {
          armed = i;
          return refresh();
        }
        saveStore.clear(i);
        erasing = false;
        armed = 0;
        this.scene.restart();
      }, 176, 18);
      slotButtons.push(b);
      const d = saveStore.load(i);
      if (d && !erasing) {
        const barW = 120;
        const pct = gameProgress(d);
        this.add.rectangle(cx - barW / 2, y + 11, barW, 2, 0x0b0a10).setOrigin(0, 0.5);
        this.add.rectangle(cx - barW / 2, y + 11, Math.max(1, barW * pct), 2, 0xc4a04a).setOrigin(0, 0.5);
      }
    }
    const eraseBtn: GothicButton = new GothicButton(this, cx, top + SLOTS * 27 + 2, 'Erase a save', () => {
      erasing = !erasing;
      armed = 0;
      eraseBtn.setText(erasing ? 'Cancel' : 'Erase a save');
      refresh();
    }, 110, 15);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') begin(saveStore.slot, !saveStore.load(saveStore.slot));
      if (/^[1-3]$/.test(e.key)) {
        const i = Number(e.key);
        begin(i, !saveStore.load(i));
      }
    });
  }
}
