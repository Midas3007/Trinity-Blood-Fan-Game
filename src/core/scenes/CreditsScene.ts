import Phaser from 'phaser';
import { audio } from '../../systems/audio/AudioManager';
import { music } from '../../systems/audio/music';
import credits from '../../data/credits.json';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../constants';
import { cutscene } from '../cutscenes';

const SCROLL_PX_PER_S = 22;
const LINE_H = 14;

/** Rolling credits after the ending, then the next-arc teaser, then back to the title. Tap to speed up. */
export class CreditsScene extends Phaser.Scene {
  private text!: Phaser.GameObjects.Text;
  private fast = false;
  private done = false;
  /** The cutscene after the credits (Act 1: the next arc's teaser; the Empire arc's ending has none). */
  private teaserId: string | null = 'teaser';
  /** Replaces the credits' second line (which arc this was). */
  private subtitle: string | null = null;

  constructor() {
    super(SCENES.credits);
  }

  init(data: { teaser?: string | null; subtitle?: string }): void {
    this.teaserId = data.teaser === undefined ? 'teaser' : data.teaser;
    this.subtitle = data.subtitle ?? null;
  }

  create(): void {
    audio.music(music.credits);
    this.done = false;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050408).setOrigin(0);
    const lines = [...(credits as { lines: string[] }).lines];
    if (this.subtitle) lines[1] = this.subtitle;
    this.text = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT + 10, lines.join('\n'), {
        fontFamily: 'serif',
        fontSize: '10px',
        color: '#eadfc4',
        align: 'center',
        lineSpacing: LINE_H - 10,
      })
      .setOrigin(0.5, 0);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => (this.fast = true));
    this.input.on(Phaser.Input.Events.POINTER_UP, () => (this.fast = false));
  }

  update(_t: number, dt: number): void {
    if (this.done) return;
    this.text.y -= (SCROLL_PX_PER_S * (this.fast ? 5 : 1) * dt) / 1000;
    if (this.text.y + this.text.height < -10) this.teaser();
  }

  private teaser(): void {
    this.done = true;
    const next = (): void => {
      this.scene.start(SCENES.menu);
    };
    const id = this.teaserId;
    if (!id || !cutscene(id)) return next();
    this.game.events.once(`cutscene-done:${id}`, next);
    this.scene.launch(SCENES.cutscene, { id });
    this.scene.bringToTop(SCENES.cutscene);
  }
}
