import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../core/constants';
import lore from '../data/lore.json';

const PANEL_W = 300;
const PAD = 6;
const TOP = 34;

export interface LoreEntry {
  title: string;
  text: string;
  /** Progression flag set when this is read (e.g. 'crusnik'). */
  unlocks?: string;
}

const entries = lore.entries as Record<string, LoreEntry>;

export function loreEntry(id: string): LoreEntry | null {
  return entries[id] ?? null;
}

/** Shows a lore text at the top of the screen while the player stands at its stone. */
export class LorePanel {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private shown: string | null = null;

  constructor(scene: Phaser.Scene) {
    const x = GAME_WIDTH / 2;
    this.bg = scene.add.rectangle(x, TOP, PANEL_W, 10, 0x0b0a10, 0.85).setOrigin(0.5, 0).setStrokeStyle(1, COLORS.accent);
    this.title = scene.add.text(x, TOP + PAD, '', { fontFamily: 'serif', fontSize: '10px', color: COLORS.text }).setOrigin(0.5, 0);
    this.body = scene.add
      .text(x, TOP + PAD + 14, '', { fontFamily: 'serif', fontSize: '8px', color: COLORS.text, wordWrap: { width: PANEL_W - PAD * 2 }, align: 'center' })
      .setOrigin(0.5, 0);
    for (const o of [this.bg, this.title, this.body]) o.setScrollFactor(0).setDepth(60).setVisible(false);
  }

  /** id of the lore to show, or null to hide. */
  show(id: string | null): void {
    if (id === this.shown) return;
    this.shown = id;
    const e = id ? loreEntry(id) : null;
    for (const o of [this.bg, this.title, this.body]) o.setVisible(e !== null);
    if (!e) return;
    this.title.setText(e.title);
    this.body.setText(e.text);
    this.bg.height = this.body.y + this.body.height + PAD - TOP;
  }
}
