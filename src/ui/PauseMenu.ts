import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { GOTHIC, GothicButton } from './GothicButton';

const DEPTH = 1500;
const PANEL_W = 190;
const PANEL_H = 214;
const CY = GAME_HEIGHT / 2;

export interface PauseActions {
  resume: () => void;
  title: () => void;
  codex: () => void;
  options: () => void;
  /** Switch to the next weapon carried; returns the label to show (null = only one weapon, button hidden). */
  weapon: () => string | null;
  /** The weapon button's label now (null = only one weapon carried). */
  weaponLabel: () => string | null;
}

/** Pause panel: an ornate gothic frame with Resume, the weapon in hand, the Codex, Options and Return to title. */
export class PauseMenu {
  private readonly parts: Phaser.GameObjects.GameObject[] = [];
  private readonly buttons: GothicButton[];
  private shown = false;

  constructor(scene: Phaser.Scene, private readonly actions: PauseActions) {
    const cx = GAME_WIDTH / 2;
    // Dim the game; the dimmer also swallows taps so nothing reaches the controls underneath.
    const dim = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0a10, 0.72).setOrigin(0).setInteractive();
    dim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => e.stopPropagation());

    const frame = scene.add.graphics();
    const l = cx - PANEL_W / 2;
    const t = CY - PANEL_H / 2;
    frame.fillStyle(GOTHIC.plate, 0.96).fillRect(l, t, PANEL_W, PANEL_H);
    frame.lineStyle(2, GOTHIC.gold, 1).strokeRect(l + 1, t + 1, PANEL_W - 2, PANEL_H - 2);
    frame.lineStyle(1, GOTHIC.goldDark, 1).strokeRect(l + 5.5, t + 5.5, PANEL_W - 11, PANEL_H - 11);
    // corner fleurons
    for (const [x, y] of [[l, t], [l + PANEL_W, t], [l, t + PANEL_H], [l + PANEL_W, t + PANEL_H]] as const) {
      frame.fillStyle(GOTHIC.gold, 1).fillCircle(x, y, 4);
      frame.fillStyle(GOTHIC.pressed, 1).fillCircle(x, y, 2);
    }
    // a small cross over the title, flanked by rules
    frame.fillStyle(GOTHIC.gold, 1).fillRect(cx - 1, t + 9, 3, 13).fillRect(cx - 5, t + 13, 11, 3);
    frame.lineStyle(1, GOTHIC.goldDark, 1).lineBetween(l + 22, t + 42, cx - 40, t + 42).lineBetween(cx + 40, t + 42, l + PANEL_W - 22, t + 42);

    const title = scene.add
      .text(cx, t + 36, 'PAUSED', { fontFamily: 'serif', fontSize: '15px', color: GOTHIC.text, stroke: '#0b0a10', strokeThickness: 3 })
      .setOrigin(0.5);

    for (const o of [dim, frame, title]) {
      (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
      (o as unknown as Phaser.GameObjects.Components.Depth).setDepth(DEPTH);
      this.parts.push(o);
    }
    const a = actions;
    this.buttons = [
      new GothicButton(scene, cx, t + 64, 'Resume', a.resume, 140, 20, DEPTH + 1),
      new GothicButton(scene, cx, t + 90, 'Weapon', () => {
        const label = a.weapon();
        if (label) this.buttons[1]?.setText(label);
      }, 140, 20, DEPTH + 1),
      new GothicButton(scene, cx, t + 116, 'Bestiary & Lore', a.codex, 140, 20, DEPTH + 1),
      new GothicButton(scene, cx, t + 142, 'Options', a.options, 140, 20, DEPTH + 1),
      new GothicButton(scene, cx, t + 168, 'Return to title', a.title, 140, 20, DEPTH + 1),
    ];
    this.hide();
  }

  get open(): boolean {
    return this.shown;
  }

  show(): void {
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }

  private setVisible(on: boolean): void {
    this.shown = on;
    for (const o of this.parts) {
      (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(on);
      if (o.input) o.input.enabled = on;
    }
    for (const b of this.buttons) b.setVisible(on);
    // The weapon button only when Abel carries more than one weapon.
    const label = on ? this.actions.weaponLabel() : null;
    this.buttons[1]?.setVisible(on && label !== null);
    if (label) this.buttons[1]?.setText(label);
  }
}
