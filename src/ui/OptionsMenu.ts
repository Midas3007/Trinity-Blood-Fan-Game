import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { audio } from '../systems/audio/AudioManager';
import { ACTIONS, type Action } from '../systems/input/actions';
import { DEFAULT_BINDINGS } from '../systems/input/KeyboardSource';
import { bindingsFrom, DIFFICULTY, rebind, settings, type Difficulty } from '../systems/settings';
import { GOTHIC, GothicButton } from './GothicButton';

const DEPTH = 1600;
const ROW_H = 21;
const TOP = 46;
const BTN_W = 196;
const BTN_H = 16;
const ORDER: Difficulty[] = ['story', 'normal', 'hard'];
const ACTION_NAMES: Record<Action, string> = { attack: 'Attack', jump: 'Jump', dodge: 'Dodge', ability: 'Ability', heal: 'Heal', parry: 'Parry' };

/** A readable name for a key code (Phaser key codes are the browser's keyCodes). */
export function keyName(code: number): string {
  const found = Object.entries(Phaser.Input.Keyboard.KeyCodes).find(([, c]) => c === code);
  return found ? found[0].replace(/_/g, ' ') : `#${code}`;
}

type Page = 'main' | 'keys';

/**
 * Options (owner, 2026-10-16), from the pause menu: difficulty, accessibility (parry assist, screen shake, flashes),
 * low effects for weaker phones, sound, keyboard keys and the touch layout. Everything saves at once (settings.ts).
 */
export class OptionsMenu {
  private parts: Phaser.GameObjects.GameObject[] = [];
  private buttons: GothicButton[] = [];
  private shown = false;
  private page: Page = 'main';
  private listening: Action | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onBack: () => void,
    private readonly onTouchLayout: () => void,
  ) {
    scene.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
  }

  get open(): boolean {
    return this.shown;
  }

  show(page: Page = 'main'): void {
    this.clear();
    this.shown = true;
    this.page = page;
    const s = this.scene;
    const dim = s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0a10, 0.9).setOrigin(0).setScrollFactor(0).setDepth(DEPTH).setInteractive();
    dim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => e.stopPropagation());
    const frame = s.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    frame.fillStyle(GOTHIC.plate, 0.97).fillRect(110, 14, GAME_WIDTH - 220, GAME_HEIGHT - 26);
    frame.lineStyle(2, GOTHIC.gold, 1).strokeRect(111, 15, GAME_WIDTH - 222, GAME_HEIGHT - 28);
    const title = s.add
      .text(GAME_WIDTH / 2, 28, page === 'main' ? 'OPTIONS' : 'KEYS', { fontFamily: 'serif', fontSize: '13px', color: GOTHIC.text, stroke: '#0b0a10', strokeThickness: 3 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
    this.parts.push(dim, frame, title);
    if (page === 'main') this.mainPage();
    else this.keysPage();
  }

  private row(i: number, text: string, onPress: () => void): GothicButton {
    const b = new GothicButton(this.scene, GAME_WIDTH / 2, TOP + i * ROW_H, text, onPress, BTN_W, BTN_H, DEPTH + 2);
    this.buttons.push(b);
    return b;
  }

  private note(y: number, text: string): void {
    this.parts.push(
      this.scene.add.text(GAME_WIDTH / 2, y, text, { fontFamily: 'serif', fontSize: '8px', color: '#8a8392' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1),
    );
  }

  private mainPage(): void {
    const st = settings.current;
    const onOff = (v: boolean): string => (v ? 'on' : 'off');
    const refresh = (): void => this.show('main');
    this.row(0, `Difficulty: ${DIFFICULTY[st.difficulty].label}`, () => {
      settings.change({ difficulty: ORDER[(ORDER.indexOf(st.difficulty) + 1) % ORDER.length]! });
      refresh();
    });
    this.row(1, `Parry assist: ${onOff(st.parryAssist)}`, () => {
      settings.change({ parryAssist: !st.parryAssist });
      refresh();
    });
    this.row(2, `Screen shake: ${onOff(st.shake)}`, () => {
      settings.change({ shake: !st.shake });
      refresh();
    });
    this.row(3, `Flashes: ${onOff(st.flashes)}`, () => {
      settings.change({ flashes: !st.flashes });
      refresh();
    });
    this.row(4, `Low effects: ${onOff(st.lowEffects)}`, () => {
      settings.change({ lowEffects: !st.lowEffects });
      refresh();
    });
    this.row(5, `Sound: ${onOff(audio.enabled)}`, () => {
      audio.setEnabled(!audio.enabled);
      refresh();
    });
    this.row(6, 'Keys (keyboard)…', () => this.show('keys'));
    this.row(7, 'Touch layout…', () => {
      this.hide();
      this.onTouchLayout();
    });
    this.row(8, 'Back', () => this.back());
    this.note(TOP + 9 * ROW_H - 4, `${DIFFICULTY[st.difficulty].note}  Low effects: no shake, fewer sparks.`);
  }

  private keysPage(): void {
    const keys = bindingsFrom(DEFAULT_BINDINGS, settings.current);
    ACTIONS.forEach((a, i) => {
      const label = this.listening === a ? `${ACTION_NAMES[a]}: press a key…` : `${ACTION_NAMES[a]}: ${keys[a].map(keyName).join(' / ')}`;
      this.row(i, label, () => {
        this.listening = a;
        this.show('keys');
      });
    });
    this.row(ACTIONS.length, 'Reset keys', () => {
      settings.change({ keys: {} });
      this.listening = null;
      this.show('keys');
    });
    this.row(ACTIONS.length + 1, 'Back', () => {
      this.listening = null;
      this.show('main');
    });
    this.note(TOP + (ACTIONS.length + 2) * ROW_H - 6, 'Tap an action, then press its new key. Arrows / WASD always move.');
    // Owner's cheat, written small at the bottom of the deepest page (see src/systems/cheatCode.ts).
    this.note(TOP + (ACTIONS.length + 2) * ROW_H + 18, 'In the margin: Up, Down, Left, Right, ATK, DODGE \u2014 blessed.\nNo harm, every weapon, open gates and altars, flight, eighty percent.');
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.shown || this.page !== 'keys' || !this.listening) return;
    const code = e.keyCode;
    const move = [37, 38, 39, 40, 65, 68, 83, 87, 27];
    if (move.includes(code)) return; // movement and Escape stay fixed
    settings.change(rebind(settings.current, DEFAULT_BINDINGS, this.listening, code));
    this.listening = null;
    this.show('keys');
  }

  private back(): void {
    this.hide();
    this.onBack();
  }

  /** Escape: one level up. */
  escape(): void {
    if (this.page === 'keys') {
      this.listening = null;
      this.show('main');
    } else this.back();
  }

  private clear(): void {
    for (const p of this.parts) p.destroy();
    for (const b of this.buttons) for (const o of b.objects) o.destroy();
    this.parts = [];
    this.buttons = [];
  }

  hide(): void {
    this.clear();
    this.shown = false;
  }
}
