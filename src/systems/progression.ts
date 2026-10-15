import raw from '../data/relics.json';
import { playerTuning } from '../player/tuning';

export interface Relic {
  flag: string;
  name: string;
  /** Latin victory card. */
  card: string;
  gift: string;
  maxHealth?: number;
  flasks?: number;
  damage?: number;
}

export const relics = (raw as unknown as { relics: Record<string, Relic> }).relics;

export interface PlayerStats {
  maxHealth: number;
  flasks: number;
  /** Extra outgoing damage factor from relics (1 = none). */
  damage: number;
}

/** Abel's stats from the relics he has earned (flags). Pure. */
export function playerStats(has: (flag: string) => boolean): PlayerStats {
  const s: PlayerStats = { maxHealth: playerTuning.maxHealth, flasks: playerTuning.flasks, damage: 1 };
  for (const r of Object.values(relics)) {
    if (!has(r.flag)) continue;
    s.maxHealth += r.maxHealth ?? 0;
    s.flasks += r.flasks ?? 0;
    s.damage += r.damage ?? 0;
  }
  return s;
}

export function relic(id: string): Relic {
  const r = relics[id];
  if (!r) throw new Error(`unknown relic "${id}"`);
  return r;
}
