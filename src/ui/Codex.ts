import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { GOTHIC, GothicButton } from './GothicButton';
import { BLOOD_LABEL, beasts, codexCount, codexItems, loreText, page, pageCount, type CodexItem, type CodexTab } from './codexData';
import { items } from '../systems/items';

const DEPTH = 1600;
const ROWS = 9;
const L = 16;
const T = 10;
const R = GAME_WIDTH - 16;
const B = GAME_HEIGHT - 8;
const LIST_X = 28;
const LIST_Y = 50;
const ROW_H = 19;
const DIVIDER_X = 168;
const DETAIL_X = 180;
const TEXT_X = 268;
/** Portraits use one integer scale (pixel art is never scaled by fractions). */
const PORTRAIT_SCALE = 2;
const LOCKED = '? ? ?';
const RED = '#d4283e';
const DIM = '#6e6676';
const BODY = { fontFamily: 'serif', fontSize: '9px', color: GOTHIC.text, lineSpacing: 2 } as const;

type Fixed = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth & Phaser.GameObjects.Components.Visible;

/**
 * The Codex (owner, 2026-10-16), opened from the pause menu: the Bestiary (every creature and boss you have beaten,
 * with its portrait, an original description, how much blood it gives and a tip) and the Lore book (every lore text
 * you have read). Locked entries keep their place in the book as "? ? ?".
 */
export class Codex {
  private readonly frame: Fixed[] = [];
  private readonly buttons: GothicButton[] = [];
  private readonly rows: Phaser.GameObjects.Text[] = [];
  private detail: Fixed[] = [];
  private readonly count: Phaser.GameObjects.Text;
  private readonly pageLabel: Phaser.GameObjects.Text;
  private tab: CodexTab = 'bestiary';
  private pageIndex = 0;
  private items: CodexItem[] = [];
  private selected: string | null = null;
  private shown = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly has: (flag: string) => boolean,
    private readonly onClose: () => void,
  ) {
    const dim = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0a10, 0.9).setOrigin(0).setInteractive();
    dim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => e.stopPropagation());
    const g = scene.add.graphics();
    g.fillStyle(GOTHIC.plate, 0.97).fillRect(L, T, R - L, B - T);
    g.lineStyle(2, GOTHIC.gold, 1).strokeRect(L + 1, T + 1, R - L - 2, B - T - 2);
    g.lineStyle(1, GOTHIC.goldDark, 1).strokeRect(L + 5.5, T + 5.5, R - L - 11, B - T - 11);
    g.lineStyle(1, GOTHIC.goldDark, 1).lineBetween(DIVIDER_X, LIST_Y - 6, DIVIDER_X, B - 14);
    this.count = scene.add.text(L + 256, 26, '', { ...BODY, color: DIM }).setOrigin(0, 0.5);
    this.pageLabel = scene.add.text(LIST_X + 64, B - 22, '', { ...BODY, color: DIM }).setOrigin(0.5);
    for (const o of [dim, g, this.count, this.pageLabel] as Fixed[]) this.fix(o, this.frame);
    for (let i = 0; i < ROWS; i++) {
      const t = scene.add.text(LIST_X, LIST_Y + i * ROW_H, '', { ...BODY, fontSize: '10px' }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      t.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        const it = page(this.items, this.pageIndex, ROWS)[i];
        if (it) this.select(it.id);
      });
      this.fix(t as unknown as Fixed, this.frame);
      this.rows.push(t);
    }
    const d = DEPTH + 2;
    this.buttons.push(
      new GothicButton(scene, L + 52, 26, 'Bestiary', () => this.setTab('bestiary'), 70, 16, d),
      new GothicButton(scene, L + 132, 26, 'Lore book', () => this.setTab('lore'), 70, 16, d),
      new GothicButton(scene, L + 212, 26, 'Items', () => this.setTab('items'), 70, 16, d),
      new GothicButton(scene, R - 44, B - 22, 'Close', () => this.close(), 52, 14, d),
      new GothicButton(scene, LIST_X + 14, B - 22, '<', () => this.turn(-1), 18, 14, d),
      new GothicButton(scene, LIST_X + 114, B - 22, '>', () => this.turn(1), 18, 14, d),
    );
    this.setVisible(false);
  }

  get open(): boolean {
    return this.shown;
  }

  show(tab: CodexTab = this.tab): void {
    this.setVisible(true);
    this.setTab(tab);
  }

  hide(): void {
    this.setVisible(false);
    this.clearDetail();
  }

  /** Close and go back (to the pause menu). */
  close(): void {
    this.hide();
    this.onClose();
  }

  private fix(o: Fixed, into: Fixed[]): void {
    o.setScrollFactor(0).setDepth(DEPTH + (into === this.detail ? 1 : 0));
    into.push(o);
  }

  private setVisible(on: boolean): void {
    this.shown = on;
    for (const o of this.frame) {
      o.setVisible(on);
      if (o.input) o.input.enabled = on;
    }
    for (const b of this.buttons) b.setVisible(on);
  }

  private setTab(tab: CodexTab): void {
    this.tab = tab;
    this.pageIndex = 0;
    this.items = codexItems(tab, this.has);
    const c = codexCount(tab, this.has);
    this.count.setText(`${tab === 'bestiary' ? 'Beasts' : tab === 'items' ? 'Found' : 'Pages'} ${c.found} / ${c.total}`);
    const first = this.items.find((i) => i.unlocked);
    this.renderList();
    if (first) this.select(first.id);
    else this.showText(tab === 'bestiary' ? 'Nothing beaten yet.' : tab === 'items' ? 'Nothing found yet.' : 'Nothing read yet.', tab === 'items' ? 'Hidden things lie off the main path: on roofs, high ledges, over spikes, at the end of side passages.' : 'Entries appear here as you find them.');
  }

  private turn(dir: number): void {
    const n = pageCount(this.items.length, ROWS);
    this.pageIndex = (this.pageIndex + dir + n) % n;
    this.renderList();
  }

  private renderList(): void {
    const rows = page(this.items, this.pageIndex, ROWS);
    this.rows.forEach((t, i) => {
      const it = rows[i];
      t.setText(it ? (it.unlocked ? it.title : LOCKED) : '');
      t.setColor(it?.id === this.selected ? RED : it?.unlocked ? GOTHIC.text : DIM);
    });
    this.pageLabel.setText(`${this.pageIndex + 1} / ${pageCount(this.items.length, ROWS)}`);
  }

  private clearDetail(): void {
    for (const o of this.detail) o.destroy();
    this.detail = [];
  }

  private select(id: string): void {
    this.selected = id;
    this.renderList();
    const it = this.items.find((i) => i.id === id);
    if (!it?.unlocked) {
      this.showText(LOCKED, this.tab === 'bestiary' ? 'Not yet beaten.' : 'Not yet found.');
      return;
    }
    if (this.tab === 'items') {
      const it = items[id];
      if (it) this.showText(it.name, it.text);
      return;
    }
    if (this.tab === 'lore') {
      const l = loreText(id);
      if (l) this.showText(l.title, l.text);
      return;
    }
    const b = beasts[id];
    if (!b) return;
    this.clearDetail();
    const s = this.scene;
    const px = (DETAIL_X + TEXT_X) / 2 - 4;
    const py = B - 30;
    if (s.anims.exists(b.anim)) {
      const spr = s.add.sprite(px, py, '').setOrigin(0.5, 1).play(b.anim);
      spr.setScale(PORTRAIT_SCALE);
      this.fix(spr as unknown as Fixed, this.detail);
    }
    const name = s.add.text(TEXT_X, LIST_Y - 6, b.name, { ...BODY, fontSize: '11px', color: RED, wordWrap: { width: R - TEXT_X - 14 } });
    const meta = s.add.text(TEXT_X, name.y + name.height + 2, `${b.kind === 'boss' ? 'Adversary' : 'Creature'}  ·  ${BLOOD_LABEL[b.blood]}`, { ...BODY, color: DIM });
    const text = s.add.text(TEXT_X, meta.y + meta.height + 6, b.text, { ...BODY, wordWrap: { width: R - TEXT_X - 14 } });
    const tip = s.add.text(TEXT_X, text.y + text.height + 6, b.tip, { ...BODY, color: '#c4a04a', fontStyle: 'italic', wordWrap: { width: R - TEXT_X - 14 } });
    for (const o of [name, meta, text, tip]) this.fix(o as unknown as Fixed, this.detail);
  }

  private showText(title: string, body: string): void {
    this.clearDetail();
    const s = this.scene;
    const t = s.add.text(DETAIL_X, LIST_Y - 6, title, { ...BODY, fontSize: '11px', color: RED });
    const b = s.add.text(DETAIL_X, t.y + t.height + 6, body, { ...BODY, fontSize: '10px', wordWrap: { width: R - DETAIL_X - 18 } });
    for (const o of [t, b]) this.fix(o as unknown as Fixed, this.detail);
  }
}
