import type { FinisherDef, FinisherTarget } from './finisherData';

/**
 * Plays one finisher: holds the target, lands the strike once at strikeAtMs, ends at durationMs.
 * Pure (no Phaser) so it can be unit tested; the Player drives it from its 'finisher' state.
 */
export class FinisherRunner {
  current: FinisherDef | null = null;
  private target: FinisherTarget | null = null;
  private elapsed = 0;
  private struck = false;

  get done(): boolean {
    return this.current === null || this.elapsed >= this.current.durationMs;
  }

  begin(def: FinisherDef, target: FinisherTarget): void {
    this.stop();
    this.current = def;
    this.target = target;
    this.elapsed = 0;
    this.struck = false;
    target.hold(true);
  }

  /** Advances time; returns true exactly once, on the tick the strike lands. */
  tick(dtMs: number, direction: 1 | -1): boolean {
    if (!this.current || !this.target) return false;
    this.elapsed += dtMs;
    if (this.struck || this.elapsed < this.current.strikeAtMs) return false;
    this.struck = true;
    this.target.hold(false);
    if (!this.target.alive) return false; // something else finished it first
    this.target.finish(direction);
    return true;
  }

  /** Ends early (e.g. the player was knocked out of it); releases a target that was not struck. */
  stop(): void {
    if (this.target && !this.struck) this.target.hold(false);
    this.current = null;
    this.target = null;
  }
}
