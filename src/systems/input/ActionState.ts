import { ACTIONS, emptyFrame, type Action, type InputFrame } from './actions';

/** Tracks held / just-pressed / just-released per action across frames. */
export class ActionState {
  private current: InputFrame = emptyFrame();
  private previous: InputFrame = emptyFrame();

  update(frame: InputFrame): void {
    this.previous = this.current;
    this.current = { moveX: frame.moveX, moveY: frame.moveY, buttons: { ...frame.buttons } };
  }

  get moveX(): number {
    return this.current.moveX;
  }

  get moveY(): number {
    return this.current.moveY;
  }

  isDown(action: Action): boolean {
    return this.current.buttons[action];
  }

  justPressed(action: Action): boolean {
    return this.current.buttons[action] && !this.previous.buttons[action];
  }

  justReleased(action: Action): boolean {
    return !this.current.buttons[action] && this.previous.buttons[action];
  }

  /** Short human-readable list of held actions, for the debug overlay. */
  heldSummary(): string {
    return ACTIONS.filter((a) => this.current.buttons[a]).join(',') || '-';
  }
}
