import type { AttackTable } from './attackData';
import type { AttackDef, AttackPhase } from './types';

/** Phase of an attack `elapsedMs` after it started. */
export function phaseAt(a: AttackDef, elapsedMs: number): AttackPhase {
  if (elapsedMs < a.startupMs) return 'startup';
  if (elapsedMs < a.startupMs + a.activeMs) return 'active';
  if (elapsedMs < a.startupMs + a.activeMs + a.recoveryMs) return 'recovery';
  return 'done';
}

/**
 * Runs one attack (and its combo follow-ups) from data. Pure: no Phaser.
 * - Pressing attack after the startup of the current swing queues the next combo step.
 * - The queued step starts as soon as the current swing reaches recovery.
 * - Each swing hits a given target at most once.
 */
export class AttackRunner {
  private def: AttackDef | null = null;
  private elapsed = 0;
  private queued = false;
  private readonly hitTargets = new Set<number>();
  /** How many swings have started since the combo began (1 = first swing). */
  comboStep = 0;

  constructor(private readonly table: AttackTable) {}

  get current(): AttackDef | null {
    return this.def;
  }

  get phase(): AttackPhase {
    return this.def ? phaseAt(this.def, this.elapsed) : 'done';
  }

  get elapsedMs(): number {
    return this.elapsed;
  }

  start(id: string): void {
    const def = this.table[id];
    if (!def) throw new Error(`unknown attack "${id}"`);
    this.def = def;
    this.elapsed = 0;
    this.queued = false;
    this.hitTargets.clear();
    this.comboStep += 1;
  }

  /** Starts a fresh combo (resets the step counter). */
  begin(id: string): void {
    this.comboStep = 0;
    this.start(id);
  }

  stop(): void {
    this.def = null;
    this.queued = false;
    this.comboStep = 0;
  }

  /** Call when the attack button is pressed during an attack. */
  pressAttack(): void {
    if (this.def?.next !== undefined && this.elapsed >= this.def.startupMs) this.queued = true;
  }

  /** Advances time; chains into the next combo step when due. Returns the phase after the tick. */
  tick(dtMs: number): AttackPhase {
    if (!this.def) return 'done';
    this.elapsed += dtMs;
    const phase = phaseAt(this.def, this.elapsed);
    if (this.queued && this.def.next !== undefined && (phase === 'recovery' || phase === 'done')) {
      this.start(this.def.next);
      return this.phase;
    }
    return phase;
  }

  get canDodgeCancel(): boolean {
    return this.def !== null && this.def.cancelIntoDodge && this.phase === 'recovery';
  }

  /** Records a hit on a target; false if this swing already hit it. */
  registerHit(targetId: number): boolean {
    if (this.hitTargets.has(targetId)) return false;
    this.hitTargets.add(targetId);
    return true;
  }
}
