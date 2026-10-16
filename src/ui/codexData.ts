import bestiary from '../data/bestiary.json';
import lore from '../data/lore.json';
import { itemFlag, items } from '../systems/items';

/** Pure data for the Codex (Bestiary and Lore book); no Phaser, so it can be tested. */
export type CodexTab = 'bestiary' | 'lore' | 'items';

export interface BeastEntry {
  name: string;
  kind: 'creature' | 'boss';
  anim: string;
  blood: 'none' | 'thin' | 'rich';
  text: string;
  tip: string;
}

export interface CodexItem {
  id: string;
  title: string;
  unlocked: boolean;
}

export const beasts = (bestiary as unknown as { entries: Record<string, BeastEntry> }).entries;
const loreEntries = (lore as unknown as { entries: Record<string, { title: string; text: string }> }).entries;

/** The flag that unlocks a bestiary entry (set the first time that creature or boss is beaten). */
export function beastFlag(id: string): string {
  return `beast:${id}`;
}

/** Every entry of a tab, in book order; locked ones keep their place but hide their title. */
export function codexItems(tab: CodexTab, has: (flag: string) => boolean): CodexItem[] {
  if (tab === 'bestiary') return Object.entries(beasts).map(([id, b]) => ({ id, title: b.name, unlocked: has(beastFlag(id)) }));
  if (tab === 'items') return Object.entries(items).map(([id, it]) => ({ id, title: it.name, unlocked: has(itemFlag(id)) }));
  return Object.entries(loreEntries).map(([id, l]) => ({ id, title: l.title, unlocked: has(`lore:${id}`) }));
}

export function loreText(id: string): { title: string; text: string } | null {
  return loreEntries[id] ?? null;
}

/** "found / total" for a tab. */
export function codexCount(tab: CodexTab, has: (flag: string) => boolean): { found: number; total: number } {
  const items = codexItems(tab, has);
  return { found: items.filter((i) => i.unlocked).length, total: items.length };
}

/** One page of a list. */
export function page<T>(items: T[], index: number, size: number): T[] {
  return items.slice(index * size, index * size + size);
}

export function pageCount(n: number, size: number): number {
  return Math.max(1, Math.ceil(n / size));
}

export const BLOOD_LABEL: Record<BeastEntry['blood'], string> = { none: 'Blood: none', thin: 'Blood: thin', rich: 'Blood: rich' };
