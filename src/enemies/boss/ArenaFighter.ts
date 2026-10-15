import type { Attacker, ContactHazard } from '../../combat/CombatSystem';
import type { Damageable, Rect } from '../../combat/types';

/** What a boss arena needs from any boss (the Marchesa, the data-driven mini bosses). */
export interface ArenaFighter extends Damageable, Attacker {
  readonly name: string;
  readonly healthFraction: number;
  /** Fallen (or yielded) and her last pose has played out. */
  readonly finished: boolean;
  /** Defeated (dying or yielding), before `finished`. */
  readonly beaten: boolean;
  /** For the test hook and debug overlay. */
  readonly stateLabel: string;
  readonly phaseNumber: number;
  /** Relic granted on victory. */
  readonly relic: string;
  /** Cutscene played when the fight reaches its second phase (and held until it ends), if any. */
  readonly phaseScene: string | undefined;
  /** Hold (true) or release (false) the phase change while a cutscene plays. */
  holdPhase(on: boolean): void;
  /** Creature summons requested since the last call. */
  drainSummons(): { creature: string; count: number }[];
  /** True once when the second phase begins. */
  drainPhaseChange(): boolean;
  hazards(playerBox: Rect): ContactHazard[];
  /** `active` false = before the fight starts (idle pose only). */
  update(dtMs: number, playerX: number, active: boolean): void;
  destroy(): void;
}
