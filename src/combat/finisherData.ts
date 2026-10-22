import raw from '../data/finishers.json';

export type AbelForm = 'priest' | 'crusnik';

export interface FinisherDef {
  id: string;
  form: AbelForm;
  targets: 'any' | 'drainable';
  range: number;
  durationMs: number;
  strikeAtMs: number;
  hitstopMs: number;
  shakeMs: number;
  shakeIntensity: number;
  heal: number;
  /** Only with this priest weapon in hand (absent = any). */
  weapon?: string | string[];
  buff?: { damageMultiplier: number; durationMs: number };
}

type RawFinisher = Omit<FinisherDef, 'id' | 'form' | 'targets'> & { form: string; targets: string };

/** Converts and validates the finishers file; throws a readable error on bad data. */
export function buildFinisherTable(file: { finishers: Record<string, RawFinisher> }): Record<string, FinisherDef> {
  const out: Record<string, FinisherDef> = {};
  for (const [id, r] of Object.entries(file.finishers)) {
    if (r.form !== 'priest' && r.form !== 'crusnik') throw new Error(`finisher "${id}": unknown form "${r.form}"`);
    if (r.targets !== 'any' && r.targets !== 'drainable') throw new Error(`finisher "${id}": unknown targets "${r.targets}"`);
    if (r.strikeAtMs <= 0 || r.strikeAtMs >= r.durationMs) throw new Error(`finisher "${id}": strikeAtMs must be inside durationMs`);
    if (r.range <= 0) throw new Error(`finisher "${id}": range must be positive`);
    if (r.buff && (r.buff.damageMultiplier < 1 || r.buff.durationMs <= 0)) throw new Error(`finisher "${id}": bad buff`);
    out[id] = { ...r, id, form: r.form, targets: r.targets };
  }
  return out;
}

export const finisherTable = buildFinisherTable(raw as { finishers: Record<string, RawFinisher> });

/** What a finisher needs to know about a possible target. */
export interface FinisherTarget {
  readonly id: number;
  readonly alive: boolean;
  readonly x: number;
  readonly y: number;
  readonly staggered: boolean;
  readonly drainable: boolean;
  /** Freeze the target in its stagger while the finisher plays (false releases it). */
  hold(on: boolean): void;
  /** The finishing blow. */
  finish(direction: 1 | -1): void;
}

const MAX_HEIGHT_GAP = 16;

/**
 * Which finisher (if any) the player can use on `t` right now. Pure; exported for tests.
 * The target must be staggered, on the same level, within range and in front of the player
 * (or the player is not holding away from it).
 */
export function chooseFinisher(
  form: AbelForm,
  weapon: string,
  px: number,
  py: number,
  facing: 1 | -1,
  t: FinisherTarget,
  table: Record<string, FinisherDef> = finisherTable,
): FinisherDef | null {
  if (!t.alive || !t.staggered || Math.abs(t.y - py) > MAX_HEIGHT_GAP) return null;
  const dx = t.x - px;
  if (dx !== 0 && Math.sign(dx) !== facing) return null;
  for (const def of Object.values(table)) {
    if (def.form !== form) continue;
    if (def.weapon !== undefined && !(Array.isArray(def.weapon) ? def.weapon.includes(weapon) : def.weapon === weapon)) continue;
    if (def.targets === 'drainable' && !t.drainable) continue;
    if (Math.abs(dx) <= def.range) return def;
  }
  return null;
}
