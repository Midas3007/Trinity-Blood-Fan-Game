/**
 * A state returns the key of the next state from `update`, or nothing to stay.
 * `stateMs` is how long the machine has been in this state, including this frame.
 * Kept free of Phaser so it can be unit tested.
 */
export interface State<K extends string, C> {
  enter?(ctx: C): void;
  update?(ctx: C, dtMs: number, stateMs: number): K | void;
  exit?(ctx: C): void;
}

export class StateMachine<K extends string, C> {
  private currentKey: K;
  private elapsedMs = 0;

  constructor(
    private readonly states: Record<K, State<K, C>>,
    initial: K,
    private readonly ctx: C,
  ) {
    this.currentKey = initial;
    this.states[initial].enter?.(ctx);
  }

  get current(): K {
    return this.currentKey;
  }

  /** Time spent in the current state (ms). */
  get stateMs(): number {
    return this.elapsedMs;
  }

  update(dtMs: number): void {
    this.elapsedMs += dtMs;
    const next = this.states[this.currentKey].update?.(this.ctx, dtMs, this.elapsedMs);
    if (next !== undefined && next !== this.currentKey) this.transition(next);
  }

  transition(next: K): void {
    this.states[this.currentKey].exit?.(this.ctx);
    this.currentKey = next;
    this.elapsedMs = 0;
    this.states[next].enter?.(this.ctx);
  }
}
