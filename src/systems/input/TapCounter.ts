/** Detects N taps within a time window (used for the on-phone debug toggle). */
export class TapCounter {
  private times: number[] = [];

  constructor(
    private readonly taps: number,
    private readonly windowMs: number,
  ) {}

  /** Records a tap at time `now` (ms). Returns true when the tap completes a sequence. */
  tap(now: number): boolean {
    this.times = this.times.filter((t) => now - t <= this.windowMs);
    this.times.push(now);
    if (this.times.length >= this.taps) {
      this.times = [];
      return true;
    }
    return false;
  }
}
