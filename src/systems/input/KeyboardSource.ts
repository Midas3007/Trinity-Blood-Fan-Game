import Phaser from 'phaser';
import { emptyFrame, type Action, type InputFrame } from './actions';

const KC = Phaser.Input.Keyboard.KeyCodes;

const BINDINGS: Record<Action, number[]> = {
  attack: [KC.J, KC.X],
  jump: [KC.SPACE, KC.K, KC.Z],
  dodge: [KC.L, KC.SHIFT, KC.C],
  ability: [KC.I, KC.V],
  heal: [KC.H, KC.F],
};

/** Desktop test controls: arrows/WASD to move, see BINDINGS for actions. */
export class KeyboardSource {
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    const codes = new Set<number>([KC.LEFT, KC.RIGHT, KC.UP, KC.DOWN, KC.A, KC.D, KC.W, KC.S]);
    Object.values(BINDINGS).forEach((list) => list.forEach((c) => codes.add(c)));
    this.keys = {};
    codes.forEach((c) => {
      this.keys[c] = keyboard.addKey(c, true);
    });
  }

  private down(code: number): boolean {
    return this.keys[code]?.isDown ?? false;
  }

  read(): InputFrame {
    const f = emptyFrame();
    f.moveX = (this.down(KC.RIGHT) || this.down(KC.D) ? 1 : 0) - (this.down(KC.LEFT) || this.down(KC.A) ? 1 : 0);
    f.moveY = (this.down(KC.DOWN) || this.down(KC.S) ? 1 : 0) - (this.down(KC.UP) || this.down(KC.W) ? 1 : 0);
    for (const [action, codes] of Object.entries(BINDINGS) as [Action, number[]][]) {
      f.buttons[action] = codes.some((c) => this.down(c));
    }
    return f;
  }
}
