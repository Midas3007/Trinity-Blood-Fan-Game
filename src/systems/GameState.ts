import { SAVE_VERSION, type SaveData } from './save/saveFormat';

/** Where the player prays and respawns. */
export interface CheckpointRef {
  room: string;
  id: string;
}

export type TimeOfDay = 'night' | 'dusk' | 'day';

/**
 * Progress that survives room changes (and, in Milestone 7, save/load). Pure; no Phaser.
 * hp null = full health on next spawn.
 */
export class GameState {
  hp: number | null = null;
  /** Time of day in the world (the story changes it). */
  time: TimeOfDay = 'night';
  /** Holy water flasks left (null = full; refilled when praying at an altar). */
  flasks: number | null = null;
  checkpoint: CheckpointRef | null = null;
  private readonly flags = new Set<string>();
  private readonly visited = new Set<string>();

  hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }

  setFlag(flag: string): void {
    this.flags.add(flag);
  }

  visit(room: string): void {
    this.visited.add(room);
  }

  /** Altars you have prayed at show on the map (kept as flags, so saves need no new field). */
  useAltar(room: string, id: string): void {
    this.setFlag(`altar:${room}:${id}`);
  }

  altarUsed(room: string, id: string): boolean {
    return this.hasFlag(`altar:${room}:${id}`);
  }

  hasVisited(room: string): boolean {
    return this.visited.has(room);
  }

  /** What a save keeps: progress, not health (a loaded game starts at the last altar, fully healed). */
  toSave(now: number): SaveData {
    return { version: SAVE_VERSION, checkpoint: this.checkpoint, flags: [...this.flags], visited: [...this.visited], time: this.time, savedAt: now };
  }

  /** Replace everything with a loaded save, or a fresh game (null). */
  load(d: SaveData | null): void {
    this.hp = null;
    this.flasks = null;
    this.flags.clear();
    this.visited.clear();
    this.checkpoint = d?.checkpoint ?? null;
    this.time = d?.time ?? 'night';
    d?.flags.forEach((f) => this.setFlag(f));
    d?.visited.forEach((v) => this.visit(v));
  }
}

/** The running game's state (one per page). */
export const gameState = new GameState();
