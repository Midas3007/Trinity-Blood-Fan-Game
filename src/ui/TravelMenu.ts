import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import type { TravelAltar } from '../world/fastTravel';
import { GOTHIC, GothicButton } from './GothicButton';

const DEPTH = 1600;
const ROW_H = 22;

/** Fast travel: the altars you can go to from this one (owner, 2026-10-16). */
export class TravelMenu {
  private parts: Phaser.GameObjects.GameObject[] = [];
  private buttons: GothicButton[] = [];
  private shown = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onPick: (a: TravelAltar) => void,
    private readonly onCancel: () => void,
  ) {}

  get open(): boolean {
    return this.shown;
  }

  show(list: TravelAltar[]): void {
    this.hide();
    this.shown = true;
    const s = this.scene;
    const h = 60 + (list.length + 1) * ROW_H;
    const top = (GAME_HEIGHT - h) / 2;
    const dim = s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0a10, 0.8).setOrigin(0).setScrollFactor(0).setDepth(DEPTH).setInteractive();
    const frame = s.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    frame.fillStyle(GOTHIC.plate, 0.97).fillRect(120, top, GAME_WIDTH - 240, h);
    frame.lineStyle(2, GOTHIC.gold, 1).strokeRect(121, top + 1, GAME_WIDTH - 242, h - 2);
    const title = s.add
      .text(GAME_WIDTH / 2, top + 16, 'TRAVEL TO', { fontFamily: 'serif', fontSize: '13px', color: GOTHIC.text, stroke: '#0b0a10', strokeThickness: 3 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
    this.parts.push(dim, frame, title);
    list.forEach((a, i) => {
      this.buttons.push(new GothicButton(s, GAME_WIDTH / 2, top + 42 + i * ROW_H, a.name, () => {
        this.hide();
        this.onPick(a);
      }, 200, 17, DEPTH + 2));
    });
    this.buttons.push(new GothicButton(s, GAME_WIDTH / 2, top + 42 + list.length * ROW_H, 'Stay', () => {
      this.hide();
      this.onCancel();
    }, 200, 17, DEPTH + 2));
  }

  hide(): void {
    for (const p of this.parts) p.destroy();
    for (const b of this.buttons) for (const o of b.objects) o.destroy();
    this.parts = [];
    this.buttons = [];
    this.shown = false;
  }
}
