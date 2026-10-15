import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import { overlaps } from '../combat/geometry';
import type { Rect } from '../combat/types';
import type { GameState } from '../systems/GameState';
import { Lever } from './Lever';
import type { Exit, RoomData } from './tiled';

const SPIKE_W = 8;
const ALTAR_W = 20;
const ALTAR_H = 10;
const ALTAR_REACH = 14;
const GATE_OPEN_MS = 500;
/** Ground this close to spikes is not a safe return point (px). */
const SAFE_MARGIN = 24;
const LORE_REACH = 16;
const STONE_W = 10;
const STONE_H = 14;

/** What the scene should do after a room update. */
export type RoomEvent =
  | { type: 'exit'; exit: Exit }
  | { type: 'pray'; checkpoint: string }
  | { type: 'hazard'; damage: number }
  | null;

export interface RoomPlayer {
  hurtbox(): Rect;
  readonly x: number;
  readonly onGround: boolean;
  /** Kneeling (crouch) on an altar prays. */
  readonly kneeling: boolean;
}

/**
 * Draws and runs a room's interactive parts: spikes, exits, altars, levers and gates.
 * Gates are real solids (added to the static group) until their lever's flag is set.
 */
export class RoomRuntime {
  readonly levers: Lever[] = [];
  private readonly gates = new Map<string, Phaser.GameObjects.Rectangle[]>();

  constructor(
    private readonly scene: Phaser.Scene,
    readonly room: RoomData,
    private readonly state: GameState,
    solids: Phaser.Physics.Arcade.StaticGroup,
    /** Live list of solid rectangles (posture checks); open gates are removed from it. */
    private readonly solidRects: Rect[],
  ) {
    // Tile rooms draw spikes as tiles; object-only rooms get simple drawn spikes.
    if (!room.layers.terrain.length) for (const h of room.hazards) this.drawSpikes(h);
    for (const c of room.checkpoints) {
      scene.add.rectangle(c.x, c.y - ALTAR_H / 2, ALTAR_W, ALTAR_H, COLORS.stone);
      scene.add.rectangle(c.x, c.y - ALTAR_H - 6, 2, 10, COLORS.spark); // candle
    }
    for (const l of room.lore) {
      scene.add.rectangle(l.x, l.y - STONE_H / 2, STONE_W, STONE_H, COLORS.stone);
      scene.add.rectangle(l.x, l.y - STONE_H + 4, 4, 2, COLORS.spark); // glowing inscription
    }
    for (const g of room.gates) {
      if (state.hasFlag(g.opens)) continue;
      const r = scene.add.rectangle(g.x + g.w / 2, g.y + g.h / 2, g.w, g.h, COLORS.stone);
      solids.add(r);
      solidRects.push(g);
      this.gates.set(g.opens, [...(this.gates.get(g.opens) ?? []), r]);
    }
    for (const l of room.levers) {
      this.levers.push(new Lever(scene, l.x, l.y, state.hasFlag(l.flag), () => this.open(l.flag)));
    }
  }

  private drawSpikes(h: Rect): void {
    const g = this.scene.add.graphics().fillStyle(COLORS.stone, 1);
    for (let x = h.x; x < h.x + h.w; x += SPIKE_W) {
      g.fillTriangle(x, h.y + h.h, x + SPIKE_W / 2, h.y, x + SPIKE_W, h.y + h.h);
    }
  }

  /** Lever thrown: remember it and lift the gate out of the way. */
  private open(flag: string): void {
    this.state.setFlag(flag);
    for (const r of this.gates.get(flag) ?? []) {
      const body = r.body as Phaser.Physics.Arcade.StaticBody;
      body.enable = false;
      const i = this.room.gates.findIndex((g) => g.opens === flag);
      const rect = this.room.gates[i];
      const k = rect ? this.solidRects.indexOf(rect) : -1;
      if (k >= 0) this.solidRects.splice(k, 1);
      this.scene.tweens.add({ targets: r, y: r.y - r.height, alpha: 0.3, duration: GATE_OPEN_MS });
    }
    this.gates.delete(flag);
  }

  /** True when x is far enough from every hazard to put the player back there. */
  safeAt(x: number): boolean {
    return this.room.hazards.every((h) => x < h.x - SAFE_MARGIN || x > h.x + h.w + SAFE_MARGIN);
  }

  /** Lore stone the player is standing at, if any. */
  loreAt(x: number): string | null {
    return this.room.lore.find((l) => Math.abs(l.x - x) <= LORE_REACH)?.id ?? null;
  }

  update(p: RoomPlayer): RoomEvent {
    const box = p.hurtbox();
    for (const e of this.room.exits) if (overlaps(box, e)) return { type: 'exit', exit: e };
    for (const h of this.room.hazards) if (overlaps(box, h)) return { type: 'hazard', damage: h.damage };
    if (p.onGround && p.kneeling) {
      for (const c of this.room.checkpoints) if (Math.abs(p.x - c.x) <= ALTAR_REACH) return { type: 'pray', checkpoint: c.id };
    }
    return null;
  }
}
