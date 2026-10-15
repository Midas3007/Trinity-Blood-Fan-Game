import Phaser from 'phaser';
import { emptyFrame, type Action, type InputFrame } from './actions';

const KC = Phaser.Input.Keyboard.KeyCodes;

const BINDINGS: Record<Action, number[]> = {
  attack: [KC.J, KC.X],
  jump: [KC.SPACE, KC.K, KC.Z, KC.UP, KC.W],
  dodge: [KC.L, KC.SHIFT, KC.C],
  ability: [KC.I, KC.V],
  heal: [KC.H, KC.F],
};

/** Desktop test controls: arrows/WASD to move (up also jumps, down crouches), see BINDINGS for actions. */
export class KeyboardSource {
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(
    keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
    private readonly now: () => number,
  ) {
    const codes = new Set<number>([KC.LEFT, KC.RIGHT, KC.UP, KC.DOWN, KC.A, KC.D, KC.W, KC.S]);
    Object.values(BINDINGS).forEach((list) => list.forEach((c) => codes.add(c)));
    this.keys = {};
    codes.forEach((c) => {
      this.keys[c] = keyboard.addKey(c, true);
    });
  }

  /** Time of the previous read(), so a press and release between two frames still counts once. */
  private lastReadTime = 0;

  private down(code: number): boolean {
    const key = this.keys[code];
    if (!key) return false;
    return key.isDown || key.timeDown > this.lastReadTime;
  }

  read(): InputFrame {
    const f = emptyFrame();
    f.moveX = (this.down(KC.RIGHT) || this.down(KC.D) ? 1 : 0) - (this.down(KC.LEFT) || this.down(KC.A) ? 1 : 0);
    f.moveY = (this.down(KC.DOWN) || this.down(KC.S) ? 1 : 0) - (this.down(KC.UP) || this.down(KC.W) ? 1 : 0);
    for (const [action, codes] of Object.entries(BINDINGS) as [Action, number[]][]) {
      f.buttons[action] = codes.some((c) => this.down(c));
    }
    this.lastReadTime = this.now();
    return f;
  }
}
