import { decodeSave, encodeSave, type SaveData } from './saveFormat';

/** The part of `localStorage` the store needs (a fake in tests). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const KEY = 'trinity-blood.save';
/** The previous good save, kept in case the newest write is cut off or corrupted. */
const BACKUP_KEY = 'trinity-blood.save.bak';
/** Which slot the player last played (the title remembers it). */
const LAST_SLOT_KEY = 'trinity-blood.slot';

/** Save slots (owner, 2026-10-16). Slot 1 keeps the original keys, so saves from before slots carry over. */
export const SLOTS = 3;

export function slotKeys(slot: number): { main: string; backup: string } {
  return slot === 1 ? { main: KEY, backup: BACKUP_KEY } : { main: `${KEY}.${slot}`, backup: `${KEY}.${slot}.bak` };
}

/**
 * Save slots in browser storage. Never throws: private browsing, full storage or a corrupt entry
 * just mean "no save" (load) or "not saved" (save → false). Calls without a slot use the active one.
 */
export class SaveStore {
  /** The slot being played (1..SLOTS). */
  slot = 1;

  constructor(private readonly storage: KeyValueStorage | null) {
    const last = Number(this.read(LAST_SLOT_KEY));
    if (Number.isInteger(last) && last >= 1 && last <= SLOTS) this.slot = last;
  }

  useSlot(slot: number): void {
    if (!Number.isInteger(slot) || slot < 1 || slot > SLOTS) return;
    this.slot = slot;
    try {
      this.storage?.setItem(LAST_SLOT_KEY, String(slot));
    } catch {
      /* storage blocked */
    }
  }

  load(slot = this.slot): SaveData | null {
    const k = slotKeys(slot);
    return decodeSave(this.read(k.main)) ?? decodeSave(this.read(k.backup));
  }

  hasSave(slot = this.slot): boolean {
    return this.load(slot) !== null;
  }

  /** True if any slot holds a save. */
  anySave(): boolean {
    for (let i = 1; i <= SLOTS; i++) if (this.load(i)) return true;
    return false;
  }

  save(data: SaveData, slot = this.slot): boolean {
    if (!this.storage) return false;
    const k = slotKeys(slot);
    try {
      const current = this.read(k.main);
      if (decodeSave(current)) this.storage.setItem(k.backup, current!);
      this.storage.setItem(k.main, encodeSave(data));
      return true;
    } catch {
      return false;
    }
  }

  clear(slot = this.slot): void {
    const k = slotKeys(slot);
    try {
      this.storage?.removeItem(k.main);
      this.storage?.removeItem(k.backup);
    } catch {
      /* storage blocked: nothing to clear */
    }
  }

  private read(key: string): string | null {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
}

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // some browsers throw just for touching localStorage when storage is blocked
  }
}

/** The game's save slot. */
export const saveStore = new SaveStore(browserStorage());
