import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';

const DEPTH = 1450;
const PAD = 10;
const BOX_H = 58;
const AUTO_MS = 7000;
const CHARS_PER_MS = 0.045;

import type { DialogueLine } from './dialogueLine';
export type { DialogueLine };

/**
 * A framed dialogue box at the bottom of the screen. Text types out; a tap (or ATK/JUMP via `advance`) shows
 * the whole line, the next tap moves on. `onDone` runs after the last line.
 */
export class DialogueBox {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly speaker: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private lines: DialogueLine[] = [];
  private index = 0;
  private ms = 0;
  private onDone: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    const y = GAME_HEIGHT - BOX_H - 8;
    this.bg = scene.add.rectangle(16, y, GAME_WIDTH - 32, BOX_H, 0x0b0a10, 0.9).setOrigin(0).setStrokeStyle(1, 0xc4a04a);
    this.speaker = scene.add.text(16 + PAD, y + 6, '', { fontFamily: 'serif', fontSize: '10px', color: '#d4283e' });
    this.body = scene.add.text(16 + PAD, y + 20, '', { fontFamily: 'serif', fontSize: '10px', color: '#eadfc4', wordWrap: { width: GAME_WIDTH - 32 - PAD * 2 }, lineSpacing: 2 });
    this.hint = scene.add.text(GAME_WIDTH - 16 - PAD, y + BOX_H - 4, 'tap ▸', { fontFamily: 'monospace', fontSize: '7px', color: '#8a8392' }).setOrigin(1, 1);
    for (const o of [this.bg, this.speaker, this.body, this.hint]) o.setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.open) this.advance();
    });
  }

  get open(): boolean {
    return this.bg.visible;
  }

  play(lines: DialogueLine[], onDone: () => void): void {
    this.lines = lines;
    this.index = 0;
    this.ms = 0;
    this.onDone = onDone;
    for (const o of [this.bg, this.speaker, this.body, this.hint]) o.setVisible(true);
    this.render();
  }

  /** Finish typing the line, or go to the next one. */
  advance(): void {
    const line = this.lines[this.index];
    if (!line) return;
    if (this.ms * CHARS_PER_MS < line.text.length) {
      this.ms = line.text.length / CHARS_PER_MS;
      this.render();
      return;
    }
    this.index++;
    this.ms = 0;
    if (this.index >= this.lines.length) {
      for (const o of [this.bg, this.speaker, this.body, this.hint]) o.setVisible(false);
      const done = this.onDone;
      this.onDone = null;
      done?.();
      return;
    }
    this.render();
  }

  update(dtMs: number): void {
    if (!this.open) return;
    this.ms += dtMs;
    const line = this.lines[this.index];
    if (line && this.ms * CHARS_PER_MS >= line.text.length + AUTO_MS * CHARS_PER_MS) this.advance();
    else this.render();
  }

  private render(): void {
    const line = this.lines[this.index];
    if (!line) return;
    this.speaker.setText(line.speaker);
    this.body.setText(line.text.slice(0, Math.floor(this.ms * CHARS_PER_MS)));
  }
}
