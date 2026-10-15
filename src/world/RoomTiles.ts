import Phaser from 'phaser';
import { TILE, type RoomData } from './tiled';

export const TILESET_KEY = 'tiles_istvan';
const DEPTH = { back: 1, terrain: 3, facade: 15 } as const;
/** Facade opacity while you are inside that building, and how fast it fades (per second). */
const INSIDE_ALPHA = 0.12;
const FADE_PER_S = 5;

/**
 * Draws a room's tile layers (back, terrain, facade) and fades a building's facade while the player is inside it.
 */
export class RoomTiles {
  private readonly facade: Phaser.Tilemaps.TilemapLayer | null = null;
  private readonly byComponent: Phaser.Tilemaps.Tile[][] = [];
  private readonly alpha: Float32Array;
  private inside = -1;

  constructor(scene: Phaser.Scene, private readonly room: RoomData) {
    this.alpha = new Float32Array(room.interiorCount).fill(1);
    if (!room.layers.terrain.length || !scene.textures.exists(TILESET_KEY)) return;
    const map = scene.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: room.cols, height: room.rows });
    const ts = map.addTilesetImage('istvan', TILESET_KEY, TILE, TILE, 0, 0, 1);
    if (!ts) return;
    for (const name of ['back', 'terrain', 'facade'] as const) {
      const data = room.layers[name];
      if (!data.length) continue;
      const layer = map.createBlankLayer(name, ts);
      if (!layer) continue;
      const rows: number[][] = [];
      for (let r = 0; r < room.rows; r++) rows.push(data.slice(r * room.cols, (r + 1) * room.cols).map((g) => (g === 0 ? -1 : g)));
      layer.putTilesAt(rows, 0, 0, false).setDepth(DEPTH[name]);
      if (name === 'facade') this.facade = layer;
    }
    if (this.facade) {
      for (let i = 0; i < room.interior.length; i++) {
        const id = room.interior[i]!;
        if (id < 0) continue;
        const t = this.facade.getTileAt(i % room.cols, Math.floor(i / room.cols));
        if (t) (this.byComponent[id] ??= []).push(t);
      }
    }
  }

  /** Building the point (room pixels) is inside, or -1. */
  interiorAt(x: number, y: number): number {
    const c = Math.floor(x / TILE);
    const r = Math.floor(y / TILE);
    if (c < 0 || r < 0 || c >= this.room.cols || r >= this.room.rows) return -1;
    return this.room.interior[r * this.room.cols + c] ?? -1;
  }

  update(dtMs: number, px: number, py: number): void {
    this.inside = this.interiorAt(px, py);
    const step = (FADE_PER_S * dtMs) / 1000;
    for (let id = 0; id < this.alpha.length; id++) {
      const target = id === this.inside ? INSIDE_ALPHA : 1;
      const a = this.alpha[id]!;
      if (a === target) continue;
      const next = a < target ? Math.min(target, a + step) : Math.max(target, a - step);
      this.alpha[id] = next;
      for (const t of this.byComponent[id] ?? []) t.alpha = next;
    }
  }
}
