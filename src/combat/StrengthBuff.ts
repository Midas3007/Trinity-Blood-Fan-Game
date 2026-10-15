/** A timed damage multiplier (from the blood drain). Re-applying refreshes the timer and keeps the larger multiplier. */
export class StrengthBuff {
  private multiplier = 1;
  private remainingMs = 0;

  get damageMultiplier(): number {
    return this.remainingMs > 0 ? this.multiplier : 1;
  }

  get active(): boolean {
    return this.remainingMs > 0;
  }

  get remaining(): number {
    return this.remainingMs;
  }

  apply(multiplier: number, durationMs: number): void {
    this.multiplier = this.remainingMs > 0 ? Math.max(this.multiplier, multiplier) : multiplier;
    this.remainingMs = Math.max(this.remainingMs, durationMs);
  }

  tick(dtMs: number): void {
    this.remainingMs = Math.max(0, this.remainingMs - dtMs);
  }

  clear(): void {
    this.remainingMs = 0;
  }
}
