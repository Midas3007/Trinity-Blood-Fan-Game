import raw from '../data/crusnik.json';
import type { PlayerTuning } from './tuning';

export interface CrusnikConfig {
  unlockFlag: string;
  meterMax: number;
  gainPerHit: number;
  gainPerKill: number;
  gainPerDrain: number;
  drainPerSecond: number;
  transformMs: number;
  damageMultiplier: number;
  jumpVelocity: number;
  runSpeed: number;
}

export const crusnikConfig: CrusnikConfig = raw;

/** The Crusnik leaps higher and runs faster; everything else is the priest's tuning. */
export function crusnikTuning(t: PlayerTuning, cfg: CrusnikConfig = crusnikConfig): PlayerTuning {
  return { ...t, jumpVelocity: cfg.jumpVelocity, runSpeed: cfg.runSpeed };
}

/**
 * The blood meter behind the Crusnik form. Pure (no Phaser).
 * Fills from combat while in priest form; when full, the form can be taken; while active it drains to zero.
 */
export class CrusnikMeter {
  unlocked = false;
  active = false;
  private value = 0;

  constructor(private readonly cfg: CrusnikConfig = crusnikConfig) {}

  get fraction(): number {
    return this.value / this.cfg.meterMax;
  }

  /** Full, unlocked and not already transformed. */
  get ready(): boolean {
    return this.unlocked && !this.active && this.value >= this.cfg.meterMax;
  }

  /** Blood from landing hits and kills (priest form only: the form cannot feed itself). */
  gain(amount: number): void {
    if (!this.unlocked || this.active) return;
    this.value = Math.min(this.cfg.meterMax, this.value + amount);
  }

  /** Blood drained from a Methuselah: also tops up an active form. */
  feed(amount: number): void {
    if (!this.unlocked) return;
    this.value = Math.min(this.cfg.meterMax, this.value + amount);
  }

  fill(): void {
    if (this.unlocked) this.value = this.cfg.meterMax;
  }

  /** Take the form if ready. */
  activate(): boolean {
    if (!this.ready) return false;
    this.active = true;
    return true;
  }

  /** Drains while active. Returns true on the step the form runs out. */
  tick(dtMs: number): boolean {
    if (!this.active) return false;
    this.value = Math.max(0, this.value - (this.cfg.drainPerSecond * dtMs) / 1000);
    if (this.value > 0) return false;
    this.active = false;
    return true;
  }

  /** Carried between rooms (the scene restarts per room). */
  snapshot(): { value: number; active: boolean } {
    return { value: this.value, active: this.active };
  }

  restore(s: { value: number; active: boolean }): void {
    this.value = Math.max(0, Math.min(this.cfg.meterMax, s.value));
    this.active = s.active && this.unlocked && this.value > 0;
  }

  /** Leave the form at once (death, room reset). */
  end(): void {
    this.active = false;
  }
}
