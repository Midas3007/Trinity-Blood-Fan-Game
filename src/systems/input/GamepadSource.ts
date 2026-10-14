import Phaser from 'phaser';
import { emptyFrame, type InputFrame } from './actions';

const AXIS_DEAD_ZONE = 0.25;

/** Standard-mapping gamepad: left stick or d-pad to move; A jump, X attack, B dodge, Y ability, RB heal. */
export class GamepadSource {
  constructor(private readonly plugin: Phaser.Input.Gamepad.GamepadPlugin | null) {}

  read(): InputFrame {
    const f = emptyFrame();
    const pad = this.plugin?.getPad(0);
    if (!pad || !pad.connected) return f;
    const ax = pad.leftStick.x;
    const ay = pad.leftStick.y;
    f.moveX = Math.abs(ax) > AXIS_DEAD_ZONE ? ax : (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
    f.moveY = Math.abs(ay) > AXIS_DEAD_ZONE ? ay : (pad.down ? 1 : 0) - (pad.up ? 1 : 0);
    f.buttons.jump = pad.A;
    f.buttons.attack = pad.X;
    f.buttons.dodge = pad.B;
    f.buttons.ability = pad.Y;
    f.buttons.heal = pad.R1 > 0;
    return f;
  }
}
