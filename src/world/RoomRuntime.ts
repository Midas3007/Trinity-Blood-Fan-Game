import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import { overlaps } from '../combat/geometry';
import type { Rect } from '../combat/types';
import type { GameState } from '../systems/GameState';
import { Lever } from './Lever';
import type { Exit, RoomData } from './tiled';
import { easeAlpha, ROOF_ALPHA, upOnFront } from './seeThrough';

/** Ledge guides over a painted landmark: faint from the ground, clear while you are up on it. */
const GUIDE_ALPHA = { far: 0.45, near: 1 } as const;
const GUIDE_FADE_PER_S = 4;
const DEPTH_GUIDE = 9.6;

const SPIKE_W = 8;
const DEPTH_DECOR = 2;
const DEPTH_GLOW = 31;
const ALTAR_W = 20;
const ALTAR_H = 10;
const ALTAR_REACH = 14;
const GATE_OPEN_MS = 500;
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
  /** Painted landmarks (the cathedral front) with the ledge guides drawn over them. */
  private readonly landmarks: { img: Phaser.GameObjects.Image; guides: Phaser.GameObjects.Graphics; up: number }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    readonly room: RoomData,
    private readonly state: GameState,
    solids: Phaser.Physics.Arcade.StaticGroup,
    /** Live list of solid rectangles (posture checks); open gates are removed from it. */
    private readonly solidRects: Rect[],
    /** 0..1 how strongly lamps glow (time of day). */
    private readonly lampGlow = 0.5,
  ) {
    // Tile rooms draw spikes as tiles; object-only rooms get simple drawn spikes.
    if (!room.layers.terrain.length) for (const h of room.hazards) this.drawSpikes(h);
    for (const c of room.checkpoints) {
      if (scene.textures.exists('altar')) {
        scene.add.image(c.x, c.y, 'altar').setOrigin(0.5, 1).setDepth(DEPTH_DECOR);
        // candle flames glow (altar candles sit 14 px either side of centre, 34 px up)
        for (const dx of [-14, 14]) {
          scene.add.circle(c.x + dx, c.y - 34, 10, 0xd9963a, 0.12).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH_GLOW);
          scene.add.circle(c.x + dx, c.y - 34, 4, 0xe8c86a, 0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH_GLOW);
        }
      } else {
        scene.add.rectangle(c.x, c.y - ALTAR_H / 2, ALTAR_W, ALTAR_H, COLORS.stone);
      }
    }
    for (const l of room.lore) {
      scene.add.rectangle(l.x, l.y - STONE_H / 2, STONE_W, STONE_H, COLORS.stone);
      scene.add.rectangle(l.x, l.y - STONE_H + 4, 4, 2, COLORS.spark); // glowing inscription
    }
    for (const d of room.decor) this.drawDecor(d.item, d.x, d.y, d.h);
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

  /** Simple pixel props; lights glow above the time-of-day overlay. */
  private drawDecor(item: string, x: number, y: number, h: number): void {
    const s = this.scene;
    const glow = (gx: number, gy: number, r: number): void => {
      if (this.lampGlow <= 0) return;
      // Soft falloff: a few faint rings instead of one solid disc.
      for (const [k, a] of [[1, 0.06], [0.7, 0.08], [0.45, 0.12], [0.22, 0.25]] as const) {
        s.add.circle(gx, gy, r * k, 0xd9963a, this.lampGlow * a).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH_GLOW);
      }
    };
    if (item.startsWith('img:')) {
      // a painted landmark, standing on its marker (bottom centre)
      const key = item.slice(4);
      if (!s.textures.exists(key)) return;
      const img = s.add.image(x, y, key).setOrigin(0.5, 1).setDepth(DEPTH_DECOR);
      // Its ledges are invisible tiles on the painting: draw a thin gold line along each so you can see where to stand.
      const box = img.getBounds();
      const guides = s.add.graphics().setDepth(DEPTH_GUIDE).setAlpha(GUIDE_ALPHA.far);
      for (const o of this.room.oneways) {
        if (o.x + o.w < box.x || o.x > box.right || o.y < box.y || o.y > box.bottom) continue;
        guides.fillStyle(0xe8c86a, 1).fillRect(o.x, o.y, o.w, 2);
        guides.fillStyle(0x0b0a10, 0.6).fillRect(o.x, o.y + 2, o.w, 1);
      }
      this.landmarks.push({ img, guides, up: 0 });
      return;
    }
    switch (item) {
      case 'lamp': // gas street lamp
        s.add.rectangle(x, y - 14, 2, 28, 0x1c1826).setDepth(DEPTH_DECOR);
        s.add.rectangle(x, y - 30, 6, 6, 0x251f30).setDepth(DEPTH_DECOR);
        s.add.rectangle(x, y - 30, 4, 4, this.lampGlow > 0 ? 0xe8c86a : 0x5c5464).setDepth(DEPTH_DECOR);
        glow(x, y - 30, 26);
        break;
      case 'lantern': { // hanging from a chain of length h
        const len = h || 24;
        s.add.rectangle(x, y - len / 2, 1, len, 0x3b3444).setDepth(DEPTH_DECOR);
        s.add.rectangle(x, y + 3, 6, 8, 0x251f30).setDepth(DEPTH_DECOR);
        s.add.rectangle(x, y + 3, 4, 5, this.lampGlow > 0 ? 0xd9963a : 0x5c5464).setDepth(DEPTH_DECOR);
        glow(x, y + 3, 20);
        break;
      }
      case 'chain':
        s.add.rectangle(x, y - (h || 48) / 2, 2, h || 48, 0x2e2836).setDepth(DEPTH_DECOR);
        break;
      case 'banner':
        s.add.rectangle(x, y + 12, 10, 24, 0x6a1524).setDepth(DEPTH_DECOR);
        s.add.rectangle(x, y + 2, 4, 4, 0xc4a04a).setDepth(DEPTH_DECOR);
        break;
      case 'barrel':
        s.add.rectangle(x, y - 6, 10, 12, 0x5a3618).setDepth(DEPTH_DECOR);
        s.add.rectangle(x, y - 9, 10, 1, 0x3b3444).setDepth(DEPTH_DECOR);
        s.add.rectangle(x, y - 3, 10, 1, 0x3b3444).setDepth(DEPTH_DECOR);
        break;
      default: // crate
        s.add.rectangle(x, y - 6, 12, 12, 0x7a4a1e).setStrokeStyle(1, 0x3d2512).setDepth(DEPTH_DECOR);
    }
  }

  private drawSpikes(h: Rect): void {
    const g = this.scene.add.graphics().fillStyle(COLORS.stone, 1);
    for (let x = h.x; x < h.x + h.w; x += SPIKE_W) {
      g.fillTriangle(x, h.y + h.h, x + SPIKE_W / 2, h.y, x + SPIKE_W, h.y + h.h);
    }
  }

  /** Lever thrown: remember it and lift the gate out of the way. */
  /** Sets the flag and raises every gate it opens (levers, and story events such as a boss's defeat). */
  open(flag: string): void {
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


  /** Up on a landmark: it half-fades and its ledge guides brighten; on the ground they stay faint. */
  updateLandmarks(dtMs: number, px: number, feetY: number): void {
    for (const l of this.landmarks) {
      const i = l.img;
      const front = { x: i.x - i.width / 2, y: i.y - i.height, w: i.width, h: i.height };
      const target = upOnFront(front, px, feetY) ? 1 : 0;
      if (l.up === target) continue;
      l.up = easeAlpha(l.up, target, GUIDE_FADE_PER_S, dtMs);
      i.setAlpha(1 - (1 - ROOF_ALPHA) * l.up);
      l.guides.setAlpha(GUIDE_ALPHA.far + (GUIDE_ALPHA.near - GUIDE_ALPHA.far) * l.up);
    }
  }

  /** The altar the player is standing at (same level), if any. */
  altarAt(x: number, feetY: number): string | null {
    return this.room.checkpoints.find((c) => Math.abs(c.x - x) <= ALTAR_REACH && Math.abs(c.y - feetY) <= 20)?.id ?? null;
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
