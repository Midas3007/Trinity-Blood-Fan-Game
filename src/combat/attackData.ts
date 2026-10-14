import raw from '../data/attacks.json';
import type { AttackDef } from './types';

export type AttackTable = Record<string, AttackDef>;

interface RawAttackFile {
  attacks: Record<string, Omit<AttackDef, 'id'>>;
  groundStarter: string;
  airStarter: string;
}

/** Throws with a readable message if attack data is inconsistent. */
export function validateAttacks(table: AttackTable): void {
  for (const [id, a] of Object.entries(table)) {
    const times = [a.startupMs, a.activeMs, a.recoveryMs];
    if (times.some((t) => !Number.isFinite(t) || t < 0)) throw new Error(`attack "${id}": times must be >= 0`);
    if (a.activeMs <= 0) throw new Error(`attack "${id}": activeMs must be > 0`);
    if (a.damage < 0) throw new Error(`attack "${id}": damage must be >= 0`);
    if (a.hitbox.w <= 0 || a.hitbox.h <= 0) throw new Error(`attack "${id}": hitbox needs a size`);
    if (a.next !== undefined && !(a.next in table)) throw new Error(`attack "${id}": next "${a.next}" does not exist`);
  }
  // Combos must end: follow each chain and fail on a loop.
  for (const id of Object.keys(table)) {
    const seen = new Set<string>();
    let cur: string | undefined = id;
    while (cur !== undefined) {
      if (seen.has(cur)) throw new Error(`attack "${id}": combo loops back to "${cur}"`);
      seen.add(cur);
      cur = table[cur]?.next;
    }
  }
}

export function buildAttackTable(file: RawAttackFile): AttackTable {
  const table: AttackTable = {};
  for (const [id, a] of Object.entries(file.attacks)) table[id] = { ...a, id };
  validateAttacks(table);
  for (const starter of [file.groundStarter, file.airStarter]) {
    if (!(starter in table)) throw new Error(`starter attack "${starter}" does not exist`);
  }
  return table;
}

const file = raw as RawAttackFile;
export const attackTable: AttackTable = buildAttackTable(file);
export const GROUND_STARTER = file.groundStarter;
export const AIR_STARTER = file.airStarter;
