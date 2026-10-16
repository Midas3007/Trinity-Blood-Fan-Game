import Phaser from 'phaser';
import { emptyFrame, type Action, type InputFrame } from './actions';
import { bindingsFrom, settings } from '../settings';

const KC = Phaser.Input.Keyboard.KeyCodes;

/** Default keys per action; the player can rebind them (Options → Keys, saved in settings). */
export const DEFAULT_BINDINGS: Record<Action, number[]> = {
  attack: [KC.J, KC.X],
  jump: [KC.SPACE, KC.K, KC.Z, KC.UP, KC.W],
  dodge: [KC.L, KC.SHIFT, KC.C],
  ability: [KC.I, KC.V],
  heal: [KC.H, KC.F],
  parry: [KC.O, KC.B],
};

/** Desktop test controls: arrows/WASD to move (up also jumps, down crouches), see BINDINGS for actions. */
export class KeyboardSource {
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key> = {};

  constructor(
    private readonly keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
    private readonly now: () => number,
  ) {
    for (const c of [KC.LEFT, KC.RIGHT, KC.UP, KC.DOWN, KC.A, KC.D, KC.W, KC.S]) this.key(c);
    Object.values(DEFAULT_BINDINGS).forEach((list) => list.forEach((c) => this.key(c)));
  }

  /** Time of the previous read(), so a press and release between two frames still counts once. */
  private lastReadTime = 0;

  private key(code: number): Phaser.Input.Keyboard.Key {
    return (this.keys[code] ??= this.keyboard.addKey(code, true));
  }

  private down(code: number): boolean {
    const key = this.key(code);
    return key.isDown || key.timeDown > this.lastReadTime;
  }

  read(): InputFrame {
    const f = emptyFrame();
    f.moveX = (this.down(KC.RIGHT) || this.down(KC.D) ? 1 : 0) - (this.down(KC.LEFT) || this.down(KC.A) ? 1 : 0);
    f.moveY = (this.down(KC.DOWN) || this.down(KC.S) ? 1 : 0) - (this.down(KC.UP) || this.down(KC.W) ? 1 : 0);
    // Bindings are read every frame, so a rebinding in Options works at once.
    for (const [action, codes] of Object.entries(bindingsFrom(DEFAULT_BINDINGS, settings.current)) as [Action, number[]][]) {
      f.buttons[action] = codes.some((c) => this.down(c));
    }
    this.lastReadTime = this.now();
    return f;
  }
}
