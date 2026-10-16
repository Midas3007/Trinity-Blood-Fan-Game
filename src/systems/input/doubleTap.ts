/** Tells a single tap from a double tap of one button. A single tap is only known once the window has passed. Pure. */
export type Tap = 'single' | 'double' | null;

export class TapCounter {
  private waitingMs = 0;

  constructor(private readonly windowMs: number) {}

  /** One frame: was the button pressed this frame? Returns the tap that completed this frame, if any. */
  update(pressed: boolean, dtMs: number): Tap {
    if (pressed) {
      if (this.waitingMs > 0) {
        this.waitingMs = 0;
        return 'double';
      }
      this.waitingMs = this.windowMs;
      return null;
    }
    if (this.waitingMs <= 0) return null;
    this.waitingMs -= dtMs;
    return this.waitingMs <= 0 ? 'single' : null;
  }

  reset(): void {
    this.waitingMs = 0;
  }
}
