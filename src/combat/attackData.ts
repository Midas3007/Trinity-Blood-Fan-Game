import raw from '../data/attacks.json';
import weaponsRaw from '../data/weapons.json';
import type { AttackDef } from './types';

export type AttackTable = Record<string, AttackDef>;

/** Which attack each kind of press starts, per form. `ranged` is ABIL's attack (none for the priest). */
export interface Starters {
  ground: string;
  air: string;
  crouch: string;
  ranged: string | null;
}

interface RawAttackFile {
  attacks: Record<string, Omit<AttackDef, 'id'>>;
  groundStarter: string;
  airStarter: string;
  crouchStarter: string;
  crusnikStarters: Omit<Starters, 'ranged'> & { ranged: string };
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

/** Builds and validates a table from `{ id: attack-without-id }` records (player or enemy attacks). */
export function tableFromRecord(rec: Record<string, Omit<AttackDef, 'id'>>): AttackTable {
  const table: AttackTable = {};
  for (const [id, a] of Object.entries(rec)) table[id] = { ...a, id };
  validateAttacks(table);
  return table;
}

export function buildAttackTable(file: RawAttackFile): AttackTable {
  const table = tableFromRecord(file.attacks);
  const c = file.crusnikStarters;
  for (const starter of [file.groundStarter, file.airStarter, file.crouchStarter, c.ground, c.air, c.crouch, c.ranged]) {
    if (!(starter in table)) throw new Error(`starter attack "${starter}" does not exist`);
  }
  return table;
}

const file = raw as RawAttackFile;
export const attackTable: AttackTable = buildAttackTable(file);
export const GROUND_STARTER = file.groundStarter;
export const AIR_STARTER = file.airStarter;
export const CROUCH_STARTER = file.crouchStarter;

export const STARTERS: Record<'priest' | 'crusnik', Starters> = {
  priest: { ground: file.groundStarter, air: file.airStarter, crouch: file.crouchStarter, ranged: null },
  crusnik: { ...file.crusnikStarters },
};

/** A priest weapon: the attacks each press starts and its finisher (src/data/weapons.json). */
export interface WeaponDef {
  id: string;
  name: string;
  ground: string;
  air: string;
  crouch: string;
  finisher: string;
  /** Flag that gives it; null = always carried. */
  item: string | null;
}

export const weapons: Record<string, WeaponDef> = Object.fromEntries(
  Object.entries((weaponsRaw as unknown as { weapons: Record<string, Omit<WeaponDef, 'id'>> }).weapons).map(([id, w]) => {
    for (const a of [w.ground, w.air, w.crouch]) if (!(a in attackTable)) throw new Error(`weapon "${id}": attack "${a}" does not exist`);
    return [id, { ...w, id }];
  }),
);
export const DEFAULT_WEAPON = 'fists';

/** The starters for a form; the priest's depend on the weapon in hand (the Crusnik always uses the scythe). */
export function startersFor(form: 'priest' | 'crusnik', weapon: string = DEFAULT_WEAPON): Starters {
  if (form === 'crusnik') return STARTERS.crusnik;
  const w = weapons[weapon] ?? weapons[DEFAULT_WEAPON]!;
  return { ground: w.ground, air: w.air, crouch: w.crouch, ranged: null };
}
