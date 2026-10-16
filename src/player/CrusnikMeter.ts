import raw from '../data/crusnik.json';
import type { PlayerTuning } from './tuning';

export interface CrusnikConfig {
  unlockFlag: string;
  /** The meter appears (and starts filling) once this flag is set. */
  meterFlag: string;
  meterMax: number;
  /** A meter this close to full (fraction) counts as full: a 98% bar looks full on a phone. */
  fullSnap: number;
  gainPerDrain: number;
  drainPerSecond: number;
  transformMs: number;
  damageMultiplier: number;
  jumpVelocity: number;
  runSpeed: number;
  /** Methuselah bosses' blood, by boss id. */
  bossBlood: Record<string, { hit: number; kill: number } | string>;
}

export const crusnikConfig: CrusnikConfig = raw as unknown as CrusnikConfig;

/** Blood a hit or kill on a Methuselah boss gives (none for human bosses). */
export function bossBlood(bossId: string, cfg: CrusnikConfig = crusnikConfig): { hit: number; kill: number } | null {
  const b = cfg.bossBlood[bossId];
  return b && typeof b !== 'string' ? b : null;
}

/** The Crusnik leaps higher and runs faster; everything else is the priest's tuning. */
export function crusnikTuning(t: PlayerTuning, cfg: CrusnikConfig = crusnikConfig): PlayerTuning {
  return { ...t, jumpVelocity: cfg.jumpVelocity, runSpeed: cfg.runSpeed };
}

/**
 * The blood meter behind the Crusnik form. Pure (no Phaser).
 * Fills from combat while in priest form; when full, the form can be taken; while active it drains to zero.
 */
export class CrusnikMeter {
  /** The form can be taken (after Abel's first transformation). */
  unlocked = false;
  /** The meter is shown and fills (after the first mini boss), before the form itself is unlocked. */
  awake = false;
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

  /** Shown in the HUD and filling. */
  get shown(): boolean {
    return this.awake || this.unlocked;
  }

  /** Methuselah blood from landing hits and kills (priest form only: the form cannot feed itself). */
  gain(amount: number): void {
    if (!this.shown || this.active) return;
    this.add(amount);
  }

  /** Blood drained from a Methuselah: also tops up an active form. */
  feed(amount: number): void {
    if (!this.shown) return;
    this.add(amount);
  }

  private add(amount: number): void {
    this.value = Math.min(this.cfg.meterMax, this.value + amount);
    if (this.value >= this.cfg.meterMax * this.cfg.fullSnap) this.value = this.cfg.meterMax;
  }

  fill(): void {
    if (this.shown) this.value = this.cfg.meterMax;
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
