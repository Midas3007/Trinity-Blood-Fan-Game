import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { clampSpot, type TouchSpot } from '../systems/settings';
import type { Action } from '../systems/input/actions';
import { GOTHIC, GothicButton } from './GothicButton';
import type { TouchLayout } from './touchLayout';

const DEPTH = 1700;
const STEP = 3;

type Key = Action | 'stick';

/**
 * Move and resize the touch controls (owner, 2026-10-16). Drag a control to move it; tap one to select it, then
 * Smaller / Bigger. Done saves (positions as fractions of the screen, so they fit any phone); Reset restores the defaults.
 */
export class TouchLayoutEditor {
  private parts: Phaser.GameObjects.GameObject[] = [];
  private spots = new Map<Key, { spot: TouchSpot; circle: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }>();
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
      const circle = s.add
        .circle(spot.x * GAME_WIDTH, spot.y * GAME_HEIGHT, spot.radius, COLORS.accent, 0.55)
        .setStrokeStyle(2, COLORS.player, 0.8)
        .setScrollFactor(0)
        .setDepth(DEPTH + 2)
        .setInteractive({ draggable: true, useHandCursor: true });
      const label = s.add.text(circle.x, circle.y, text, { fontFamily: 'monospace', fontSize: '8px', color: COLORS.text }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 3);
      circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.select(key));
      circle.on(Phaser.Input.Events.GAMEOBJECT_DRAG, (_p: Phaser.Input.Pointer, x: number, y: number) => {
        const e = this.spots.get(key)!;
        e.spot = clampSpot({ ...e.spot, x: x / GAME_WIDTH, y: y / GAME_HEIGHT });
        this.place(key);
      });
      this.spots.set(key, { spot: { ...spot }, circle, label });
      this.parts.push(circle, label);
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
    e.label.setPosition(e.circle.x, e.circle.y);
  }

  private select(key: Key): void {
    this.selected = key;
    for (const [k, e] of this.spots) e.circle.setStrokeStyle(2, k === key ? 0xe8c86a : COLORS.player, 0.9);
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
