/** Where the player prays and respawns. */
export interface CheckpointRef {
  room: string;
  id: string;
}

export interface GameStateData {
  version: 1;
  hp: number;
  checkpoint: CheckpointRef | null;
  flags: string[];
  visited: string[];
}

/**
 * Progress that survives room changes (and, in Milestone 7, save/load). Pure; no Phaser.
 * hp null = full health on next spawn.
 */
export class GameState {
  hp: number | null = null;
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

  hasVisited(room: string): boolean {
    return this.visited.has(room);
  }

  toJSON(): GameStateData {
    return { version: 1, hp: this.hp ?? -1, checkpoint: this.checkpoint, flags: [...this.flags], visited: [...this.visited] };
  }

  static fromJSON(d: GameStateData): GameState {
    const s = new GameState();
    s.hp = d.hp >= 0 ? d.hp : null;
    s.checkpoint = d.checkpoint;
    d.flags.forEach((f) => s.setFlag(f));
    d.visited.forEach((v) => s.visit(v));
    return s;
  }
}

/** The running game's state (one per page). */
export const gameState = new GameState();
