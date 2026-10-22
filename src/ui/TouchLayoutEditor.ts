import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { clampSpot, type TouchSpot } from '../systems/settings';
import type { Action } from '../systems/input/actions';
import { GOTHIC, GothicButton } from './GothicButton';
import type { TouchLayout } from './touchLayout';
import { drawMedallion, drawStickBase } from './buttonArt';

const DEPTH = 1700;
const STEP = 3;

type Key = Action | 'stick';

/**
 * Move and resize the touch controls (owner, 2026-10-16). Drag a control to move it; tap one to select it, then
 * Smaller / Bigger. Done saves (positions as fractions of the screen, so they fit any phone); Reset restores the defaults.
 */
export class TouchLayoutEditor {
  private parts: Phaser.GameObjects.GameObject[] = [];
  private spots = new Map<Key, { spot: TouchSpot; circle: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text; art: Phaser.GameObjects.Graphics }>();
  private selected: Key = 'stick';
  private buttons: GothicButton[] = [];
  private shown = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly defaults: TouchLayout,
    private readonly onDone: (stick: TouchSpot, buttons: Partial<Record<Action, TouchSpot>>) => void,
    private readonly onReset: () => void,
  ) {}

  get open(): boolean {
    return this.shown;
  }

  show(layout: TouchLayout): void {
    this.hide();
    this.shown = true;
    const s = this.scene;
    const dim = s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0a10, 0.75).setOrigin(0).setScrollFactor(0).setDepth(DEPTH).setInteractive();
    const title = s.add
      .text(GAME_WIDTH / 2, 10, 'TOUCH LAYOUT — drag to move, tap to pick, then Smaller / Bigger', { fontFamily: 'serif', fontSize: '10px', color: GOTHIC.text })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
    this.parts.push(dim, title);
    const add = (key: Key, spot: TouchSpot, text: string): void => {
      // the drag handle is an almost clear circle; the medallion art is drawn under it
      const circle = s.add
        .circle(spot.x * GAME_WIDTH, spot.y * GAME_HEIGHT, spot.radius, 0xffffff, 0.01)
        .setScrollFactor(0)
        .setDepth(DEPTH + 3)
        .setInteractive({ draggable: true, useHandCursor: true });
      const art = s.add.graphics().setPosition(circle.x, circle.y).setScrollFactor(0).setDepth(DEPTH + 2);
      const label = s.add
        .text(circle.x, circle.y + spot.radius * 0.5, text, { fontFamily: 'serif', fontStyle: 'bold', fontSize: '7px', color: COLORS.text, stroke: '#0b0a10', strokeThickness: 2 })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH + 2);
      circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.select(key));
      circle.on(Phaser.Input.Events.GAMEOBJECT_DRAG, (_p: Phaser.Input.Pointer, x: number, y: number) => {
        const e = this.spots.get(key)!;
        e.spot = clampSpot({ ...e.spot, x: x / GAME_WIDTH, y: y / GAME_HEIGHT });
        this.place(key);
      });
      this.spots.set(key, { spot: { ...spot }, circle, label, art });
      this.parts.push(circle, label, art);
    };
    add('stick', { x: layout.stick.x, y: layout.stick.y, radius: layout.stick.radius }, 'MOVE');
    for (const b of layout.buttons) add(b.action, { x: b.x, y: b.y, radius: b.radius }, b.label);
    const by = GAME_HEIGHT / 2;
    const cx = GAME_WIDTH / 2;
    this.buttons = [
      new GothicButton(s, cx - 66, by - 16, 'Smaller', () => this.resize(-STEP), 60, 16, DEPTH + 4),
      new GothicButton(s, cx + 66, by - 16, 'Bigger', () => this.resize(STEP), 60, 16, DEPTH + 4),
      new GothicButton(s, cx - 66, by + 10, 'Reset', () => {
        this.onReset();
        this.hide();
      }, 60, 16, DEPTH + 4),
      new GothicButton(s, cx + 66, by + 10, 'Done', () => this.done(), 60, 16, DEPTH + 4),
    ];
    this.select('stick');
  }

  private place(key: Key): void {
    const e = this.spots.get(key);
    if (!e) return;
    e.circle.setPosition(e.spot.x * GAME_WIDTH, e.spot.y * GAME_HEIGHT).setRadius(e.spot.radius);
    e.label.setPosition(e.circle.x, e.circle.y + e.spot.radius * 0.5);
    e.art.setPosition(e.circle.x, e.circle.y);
    this.paint(key);
  }

  /** The control as it looks in play; the selected one lit as if held. */
  private paint(key: Key): void {
    const e = this.spots.get(key);
    if (!e) return;
    if (key === 'stick') {
      drawStickBase(e.art, e.spot.radius);
      if (key === this.selected) e.art.lineStyle(2, 0xf0ce6e, 1).strokeCircle(0, 0, e.spot.radius + 2);
      e.art.fillStyle(0x6a1626, key === this.selected ? 0.9 : 0.6).fillCircle(0, 0, e.spot.radius * 0.4);
      e.art.lineStyle(2, 0xc4a04a, 1).strokeCircle(0, 0, e.spot.radius * 0.4);
    } else {
      drawMedallion(e.art, e.spot.radius, key, key === this.selected);
    }
  }

  private select(key: Key): void {
    this.selected = key;
    for (const k of this.spots.keys()) this.paint(k);
  }

  private resize(d: number): void {
    const e = this.spots.get(this.selected);
    if (!e) return;
    e.spot = clampSpot({ ...e.spot, radius: e.spot.radius + d });
    this.place(this.selected);
    // the tap area follows the new size
    e.circle.removeInteractive();
    e.circle.setInteractive({ draggable: true, useHandCursor: true });
  }

  private done(): void {
    const buttons: Partial<Record<Action, TouchSpot>> = {};
    let stick: TouchSpot | null = null;
    for (const [k, e] of this.spots) {
      if (k === 'stick') stick = e.spot;
      else buttons[k] = e.spot;
    }
    this.hide();
    this.onDone(stick ?? { x: this.defaults.stick.x, y: this.defaults.stick.y, radius: this.defaults.stick.radius }, buttons);
  }

  hide(): void {
    for (const p of this.parts) p.destroy();
    for (const b of this.buttons) for (const o of b.objects) o.destroy();
    this.parts = [];
    this.buttons = [];
    this.spots.clear();
    this.shown = false;
  }
}
