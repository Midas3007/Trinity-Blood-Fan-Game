import raw from '../data/items.json';
import { DEFAULT_WEAPON, weapons } from '../combat/attackData';

/** Hidden items (src/data/items.json): what they give, sets, and the weapons they unlock. Pure; tested. */
export interface ItemDef {
  name: string;
  kind: 'weapon' | 'heart' | 'chalice' | 'tea';
  text: string;
  maxHealth?: number;
  flasks?: number;
  damage?: number;
  weapon?: string;
  set?: string;
}

export interface ItemSet {
  name: string;
  text: string;
  maxHealth?: number;
  flasks?: number;
  damage?: number;
}

const data = raw as unknown as { items: Record<string, ItemDef>; sets: Record<string, ItemSet> };
export const items = data.items;
export const itemSets = data.sets;

export function itemFlag(id: string): string {
  return `item:${id}`;
}

/** The items of a set, and whether all are found. */
export function setItems(set: string): string[] {
  return Object.entries(items).filter(([, it]) => it.set === set).map(([id]) => id);
}

export function setComplete(set: string, has: (flag: string) => boolean): boolean {
  const ids = setItems(set);
  return ids.length > 0 && ids.every((id) => has(itemFlag(id)));
}

/** Health, flasks and damage the found items (and completed sets) add. */
export function itemBonus(has: (flag: string) => boolean): { maxHealth: number; flasks: number; damage: number } {
  const b = { maxHealth: 0, flasks: 0, damage: 0 };
  const add = (x: { maxHealth?: number; flasks?: number; damage?: number }): void => {
    b.maxHealth += x.maxHealth ?? 0;
    b.flasks += x.flasks ?? 0;
    b.damage += x.damage ?? 0;
  };
  for (const [id, it] of Object.entries(items)) if (has(itemFlag(id))) add(it);
  for (const [id, s] of Object.entries(itemSets)) if (setComplete(id, has)) add(s);
  return b;
}

/** Weapons Abel carries: the always-carried ones plus any whose item he has found. */
export function ownedWeapons(has: (flag: string) => boolean): string[] {
  return Object.values(weapons).filter((w) => w.item === null || has(w.item)).map((w) => w.id);
}

/** The weapon in hand: the one chosen ('weapon:<id>' flag) if owned, else the best owned (the last found). */
export function currentWeapon(has: (flag: string) => boolean): string {
  const owned = ownedWeapons(has);
  const chosen = owned.find((w) => has(`weapon:${w}`));
  return chosen ?? owned[owned.length - 1] ?? DEFAULT_WEAPON;
}
