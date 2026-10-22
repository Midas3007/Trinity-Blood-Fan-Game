import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import type { TravelAltar } from '../world/fastTravel';
import { GOTHIC, GothicButton } from './GothicButton';
import { scrollBy, visibleRows } from './travelScroll';

const DEPTH = 1600;
const ROW_H = 22;
/** Frame margins: room for the title above the list and Stay below it (px). */
const TOP = 14;
const HEAD = 30;
const FOOT = 34;
const FRAME_X = 110;
/** A drag of this many px scrolls one row. */
const DRAG_ROW = ROW_H * 0.8;

/**
 * Fast travel: the altars you can go to from this one (owner, 2026-10-16). The list scrolls (owner, 2026-10-22):
 * drag it, use the arrows beside it, or the mouse wheel; Stay stays put at the bottom.
 */
export class TravelMenu {
  private parts: Phaser.GameObjects.GameObject[] = [];
  private fixed: GothicButton[] = [];
  private rows: GothicButton[] = [];
  private shown = false;
  private list: TravelAltar[] = [];
  private offset = 0;
  private rowsShown = 0;
  private count: Phaser.GameObjects.Text | null = null;
  private dragY: number | null = null;
  private dragAcc = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onPick: (a: TravelAltar) => void,
    private readonly onCancel: () => void,
  ) {
    // A drag that starts on a row button never reaches the scene's pointer-down (the button keeps it), so the drag is
    // read from movement alone: any held pointer moving over the menu scrolls it.
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (!this.shown || !p.isDown) return;
      if (this.dragY === null) {
        this.dragY = p.y;
        this.dragAcc = 0;
      }
      this.dragAcc += this.dragY - p.y;
      this.dragY = p.y;
      while (Math.abs(this.dragAcc) >= DRAG_ROW) {
        const step = Math.sign(this.dragAcc);
        this.dragAcc -= step * DRAG_ROW;
        this.scroll(step);
      }
    });
    scene.input.on(Phaser.Input.Events.POINTER_UP, () => (this.dragY = null));
    scene.input.on(Phaser.Input.Events.POINTER_WHEEL, (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.shown) this.scroll(dy > 0 ? 1 : -1);
    });
  }

  get open(): boolean {
    return this.shown;
  }

  show(list: TravelAltar[]): void {
    this.hide();
    this.shown = true;
    this.list = list;
    this.offset = 0;
    const s = this.scene;
    const bottom = GAME_HEIGHT - TOP;
    this.rowsShown = visibleRows(list.length, bottom - TOP - HEAD - FOOT, ROW_H);
    const h = HEAD + this.rowsShown * ROW_H + FOOT;
    const top = TOP + (bottom - TOP - h) / 2;
    const dim = s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0a10, 0.8).setOrigin(0).setScrollFactor(0).setDepth(DEPTH).setInteractive();
    const frame = s.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    frame.fillStyle(GOTHIC.plate, 0.97).fillRect(FRAME_X, top, GAME_WIDTH - FRAME_X * 2, h);
    frame.lineStyle(2, GOTHIC.gold, 1).strokeRect(FRAME_X + 1, top + 1, GAME_WIDTH - FRAME_X * 2 - 2, h - 2);
    const title = s.add
      .text(GAME_WIDTH / 2, top + 14, 'TRAVEL TO', { fontFamily: 'serif', fontSize: '13px', color: GOTHIC.text, stroke: '#0b0a10', strokeThickness: 3 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
    this.parts.push(dim, frame, title);
    this.listTop = top + HEAD + ROW_H / 2;
    if (list.length > this.rowsShown) {
      const ax = GAME_WIDTH - FRAME_X - 11;
      this.fixed.push(new GothicButton(s, ax, this.listTop, '▲', () => this.scroll(-1), 18, 16, DEPTH + 2));
      this.fixed.push(new GothicButton(s, ax, this.listTop + (this.rowsShown - 1) * ROW_H, '▼', () => this.scroll(1), 18, 16, DEPTH + 2));
      this.count = s.add
        .text(GAME_WIDTH - FRAME_X - 16, top + 14, '', { fontFamily: 'serif', fontStyle: 'italic', fontSize: '8px', color: '#8c8296' })
        .setOrigin(1, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH + 1);
      this.parts.push(this.count);
    }
    this.fixed.push(new GothicButton(s, GAME_WIDTH / 2, top + h - FOOT / 2, 'Stay', () => {
      this.hide();
      this.onCancel();
    }, 200, 17, DEPTH + 2));
    this.drawRows();
  }

  private listTop = 0;

  private scroll(step: number): void {
    const next = scrollBy(this.offset, step, this.list.length, this.rowsShown);
    if (next === this.offset) return;
    this.offset = next;
    this.drawRows();
  }

  /** The rows in view: rebuilt on each scroll (only a handful exist at a time). */
  private drawRows(): void {
    for (const b of this.rows) for (const o of b.objects) o.destroy();
    this.rows = [];
    const view = this.list.slice(this.offset, this.offset + this.rowsShown);
    view.forEach((a, i) => {
      this.rows.push(new GothicButton(this.scene, GAME_WIDTH / 2, this.listTop + i * ROW_H, a.name, () => {
        this.hide();
        this.onPick(a);
      }, 200, 17, DEPTH + 2));
    });
    this.count?.setText(`${this.offset + 1}–${this.offset + view.length} of ${this.list.length}`);
  }

  hide(): void {
    for (const p of this.parts) p.destroy();
    for (const b of [...this.fixed, ...this.rows]) for (const o of b.objects) o.destroy();
    this.parts = [];
    this.fixed = [];
    this.rows = [];
    this.count = null;
    this.dragY = null;
    this.shown = false;
  }
}
