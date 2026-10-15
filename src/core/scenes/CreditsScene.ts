import Phaser from 'phaser';
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

  constructor() {
    super(SCENES.credits);
  }

  create(): void {
    this.done = false;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050408).setOrigin(0);
    const lines = (credits as { lines: string[] }).lines;
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
    if (!cutscene('teaser')) return next();
    this.game.events.once('cutscene-done:teaser', next);
    this.scene.launch(SCENES.cutscene, { id: 'teaser' });
    this.scene.bringToTop(SCENES.cutscene);
  }
}
