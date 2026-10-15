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

/**
 * One save slot in browser storage. Never throws: private browsing, full storage or a corrupt entry
 * just mean "no save" (load) or "not saved" (save → false).
 */
export class SaveStore {
  constructor(private readonly storage: KeyValueStorage | null) {}

  load(): SaveData | null {
    return decodeSave(this.read(KEY)) ?? decodeSave(this.read(BACKUP_KEY));
  }

  hasSave(): boolean {
    return this.load() !== null;
  }

  save(data: SaveData): boolean {
    if (!this.storage) return false;
    try {
      const current = this.read(KEY);
      if (decodeSave(current)) this.storage.setItem(BACKUP_KEY, current!);
      this.storage.setItem(KEY, encodeSave(data));
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(KEY);
      this.storage?.removeItem(BACKUP_KEY);
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
