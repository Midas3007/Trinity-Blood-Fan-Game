/** Brief freeze on impact. Overlapping requests keep the longest remaining time. Pure. */
export class HitStop {
  private remaining = 0;

  trigger(ms: number): void {
    this.remaining = Math.max(this.remaining, ms);
  }

  get active(): boolean {
    return this.remaining > 0;
  }

  /** Advances the freeze; returns true while the game should stay frozen this frame. */
  tick(dtMs: number): boolean {
    if (this.remaining <= 0) return false;
    this.remaining = Math.max(0, this.remaining - dtMs);
    return true;
  }
}
