import raw from '../data/enemies.json';
import { tableFromRecord, type AttackTable } from '../combat/attackData';
import type { AttackDef } from '../combat/types';

export interface EnemyConfig {
  type: string;
  label: string;
  width: number;
  height: number;
  color: number;
  telegraphColor: number;
  maxHealth: number;
  walkSpeed: number;
  chaseSpeed: number;
  brakeDecel: number;
  patrolDistance: number;
  idleMs: number;
  detectRange: number;
  detectRear: number;
  detectHeight: number;
  loseRange: number;
  reactionMs: number;
  attackRange: number;
  attackCooldownMs: number;
  giveUpMs: number;
  attack: string;
  hurtStunMs: number;
  staggerBelowFraction: number;
  staggerMs: number;
  drainable: boolean;
  /** Draw the red puppet string above the head (string-bound thralls). */
  puppetString: boolean;
  knockbackTaken: number;
  interruptibleDuringActive: boolean;
  deathMs: number;
  attacks: AttackTable;
  /** Shield: damage taken from the front (outside its own swing and stagger) is multiplied by this. */
  frontGuard?: number;
  /** Ranged: the attack fires a bolt when it becomes active (instead of a blade). */
  bolt?: { speed: number; damage: number; lifeMs: number };
  /** Human: knocked out instead of killed; stays down and never respawns in this visit. */
  knockout?: boolean;
  /** Methuselah blood for the Crusnik meter: per landed hit and per kill. Absent = none (humans, puppets, beasts). */
  blood?: { hit: number; kill: number };
}

type RawEnemy = Omit<EnemyConfig, 'type' | 'color' | 'telegraphColor' | 'attacks'> & {
  color: string;
  telegraphColor: string;
  attacks: Record<string, Omit<AttackDef, 'id'>>;
};

/** Converts and validates one raw enemy entry; throws a readable error on bad data. */
export function buildEnemyConfig(type: string, r: RawEnemy): EnemyConfig {
  const attacks = tableFromRecord(r.attacks);
  if (!(r.attack in attacks)) throw new Error(`enemy "${type}": attack "${r.attack}" not in its attacks`);
  if (r.attackRange <= 0 || r.detectRange <= r.attackRange) {
    throw new Error(`enemy "${type}": detectRange must be larger than attackRange`);
  }
  if (r.loseRange < r.detectRange) throw new Error(`enemy "${type}": loseRange must be >= detectRange`);
  if (r.staggerBelowFraction < 0 || r.staggerBelowFraction >= 1) {
    throw new Error(`enemy "${type}": staggerBelowFraction must be in [0, 1)`);
  }
  return {
    ...r,
    type,
    color: Number(r.color),
    telegraphColor: Number(r.telegraphColor),
    attacks,
  };
}

const file = raw as { types: Record<string, RawEnemy> };
export const enemyConfigs: Record<string, EnemyConfig> = Object.fromEntries(
  Object.entries(file.types).map(([type, r]) => [type, buildEnemyConfig(type, r)]),
);

export function enemyConfig(type: string): EnemyConfig {
  const cfg = enemyConfigs[type];
  if (!cfg) throw new Error(`unknown enemy type "${type}"`);
  return cfg;
}
