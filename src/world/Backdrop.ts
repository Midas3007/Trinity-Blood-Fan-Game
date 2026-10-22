import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import times from '../data/timeOfDay.json';

import type { TimeOfDay } from '../systems/GameState';
export type { TimeOfDay };
interface TimeLook {
  skyTop: string;
  skyBottom: string;
  far: string;
  mid: string;
  stars: boolean;
  moon: boolean;
  overlay: string | null;
  lampGlow: number;
}
export const timeLook = (t: TimeOfDay): TimeLook => (times as unknown as Record<TimeOfDay, TimeLook>)[t];

const SKY_BANDS = 10;
const FAR_SCROLL = 0.12;
const MID_SCROLL = 0.35;
const SHIP_SCROLL = 0.2;
const SKYLINE_W = 960;
const DEPTH_SKY = -30;
const DEPTH_OVERLAY = 30;

/** Deterministic pseudo-random numbers so skylines look the same every visit. */
function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Draws a city silhouette strip into a texture (spires, domes, towers; `castle` adds the count's castle on a hill). */
function skylineTexture(scene: Phaser.Scene, key: string, h: number, seed: number, castle: boolean, dense: boolean): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  const r = rng(seed);
  g.fillStyle(0xffffff, 1);
  let x = 0;
  while (x < SKYLINE_W) {
    const w = 18 + Math.floor(r() * (dense ? 30 : 50));
    const bh = Math.floor(h * (0.25 + r() * (dense ? 0.35 : 0.3)));
    g.fillRect(x, h - bh, w, bh);
    const kind = r();
    if (kind < 0.18) {
      // spire
      const sx = x + w / 2;
      g.fillTriangle(sx - 5, h - bh, sx + 5, h - bh, sx, h - bh - 28 - r() * 20);
    } else if (kind < 0.3) {
      // dome with lantern
      g.fillCircle(x + w / 2, h - bh, w / 2.4);
      g.fillRect(x + w / 2 - 1, h - bh - w / 2.4 - 8, 2, 8);
    } else if (kind < 0.45) {
      // tower with pointed roof
      const tw = 8 + r() * 6;
      const tx = x + r() * (w - tw);
      const th = 20 + r() * 30;
      g.fillRect(tx, h - bh - th, tw, th);
      g.fillTriangle(tx - 1, h - bh - th, tx + tw + 1, h - bh - th, tx + tw / 2, h - bh - th - 12);
    } else {
      // gabled roofs
      g.fillTriangle(x, h - bh, x + w, h - bh, x + w / 2, h - bh - 6 - r() * 8);
    }
    x += w + (dense ? 0 : Math.floor(r() * 10));
  }
  if (castle) {
    // the count's castle on its hill across the river
    const cx = SKYLINE_W * 0.7;
    g.fillEllipse(cx, h, 300, 120);
    g.fillRect(cx - 60, h - 110, 120, 60);
    for (const dx of [-60, -20, 20, 56]) {
      g.fillRect(cx + dx, h - 140, 12, 40);
      g.fillTriangle(cx + dx - 2, h - 140, cx + dx + 14, h - 140, cx + dx + 6, h - 160);
    }
  }
  g.generateTexture(key, SKYLINE_W, h);
  g.destroy();
}

function shipTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('airship')) return;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(30, 9, 56, 16); // envelope
  g.fillTriangle(2, 9, -4, 2, -4, 16);
  g.fillRect(20, 17, 18, 5); // gondola
  g.fillRect(28, 15, 2, 3);
  g.generateTexture('airship', 64, 24);
  g.destroy();
}

interface Ship {
  img: Phaser.GameObjects.Image;
  light: Phaser.GameObjects.Rectangle;
  speed: number;
  baseX: number;
}

/** Sky, skylines, airships and the time-of-day light over the world. Only for outdoor rooms. */
/** Cloud bands below the Imperial Spire. */
const CLOUD_ROWS = 3;

export class Backdrop {
  /** Byzantium beyond the clouds: domes, towers and a lit window here and there, in two dim layers. */
  private domeSkyline(scene: Phaser.Scene, roomWidth: number): void {
    const r = rng(33);
    for (const [layer, color, scroll, baseY, scale] of [[0, 0x1c2a3c, 0.06, 0.56, 0.7], [1, 0x14202e, 0.12, 0.62, 1]] as const) {
      const g = scene.add.graphics().setScrollFactor(scroll, 0.05).setDepth(DEPTH_SKY + 1.5 + layer * 0.2);
      const y0 = GAME_HEIGHT * baseY;
      const span = GAME_WIDTH + roomWidth * scroll + 80;
      for (let x = -40; x < span; x += (26 + r() * 40) * scale) {
        const w = (18 + r() * 26) * scale;
        const h = (12 + r() * 22) * scale;
        g.fillStyle(color, 1).fillRect(x - w / 2, y0 - h, w, h + 40);
        if (r() < 0.65) {
          g.fillEllipse(x, y0 - h, w * 0.9, w * 0.8); // a dome
          g.fillRect(x - 0.5, y0 - h - w * 0.55, 1, w * 0.2); // its finial
        } else {
          g.fillTriangle(x - w * 0.3, y0 - h, x + w * 0.3, y0 - h, x, y0 - h - w * 0.9); // a tower's spire
        }
        if (r() < 0.5) g.fillStyle(0xd9963a, 0.5 + layer * 0.2).fillRect(x - 2 + r() * 4, y0 - h * 0.5, 1, 1);
      }
    }
  }

  /** High above the city: rows of cloud drifting below, lit faintly from beneath (pixel-art bands, no textures). */
  private clouds(scene: Phaser.Scene): void {
    const r = rng(21);
    for (let i = 0; i < CLOUD_ROWS; i++) {
      const y = GAME_HEIGHT * (0.55 + i * 0.12);
      const color = [0x41324f, 0x32263e, 0x241b2e][i % 3]!;
      const g = scene.add.graphics().setScrollFactor(0.15 + i * 0.12, 0.1).setDepth(DEPTH_SKY + 2 + i);
      g.fillStyle(color, 1).fillRect(-GAME_WIDTH, y + 10, GAME_WIDTH * 4, GAME_HEIGHT);
      for (let x = -GAME_WIDTH; x < GAME_WIDTH * 3; x += 18 + r() * 26) {
        const w = 26 + r() * 50, h = 10 + r() * 14;
        g.fillStyle(color, 1).fillEllipse(x, y + 10, w, h);
        g.fillStyle(0x6f6676, 0.25).fillEllipse(x - w * 0.15, y + 6, w * 0.5, h * 0.35); // moonlit tops
      }
    }
  }

  private readonly ships: Ship[] = [];
  private t = 0;

  /** `horizon`: room y (px) where the skylines stand (the street level). */
  constructor(scene: Phaser.Scene, readonly time: TimeOfDay, roomWidth: number, outdoor: boolean, horizon = GAME_HEIGHT, aloft = false, domes = false) {
    const look = timeLook(time);
    const col = (h: string): number => Number(h);
    if (outdoor) {
      // Sky bands (pixel-art banding instead of a smooth gradient).
      const top = Phaser.Display.Color.ValueToColor(col(look.skyTop));
      const bot = Phaser.Display.Color.ValueToColor(col(look.skyBottom));
      for (let i = 0; i < SKY_BANDS; i++) {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bot, SKY_BANDS - 1, i);
        scene.add
          .rectangle(0, (i * GAME_HEIGHT) / SKY_BANDS, GAME_WIDTH, GAME_HEIGHT / SKY_BANDS + 1, Phaser.Display.Color.GetColor(c.r, c.g, c.b))
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(DEPTH_SKY);
      }
      if (look.stars) {
        const r = rng(3);
        for (let i = 0; i < 40; i++) {
          scene.add.rectangle(r() * GAME_WIDTH, r() * GAME_HEIGHT * 0.5, 1, 1, 0xddd7e6, 0.4 + r() * 0.6).setScrollFactor(0).setDepth(DEPTH_SKY + 1);
        }
      }
      if (look.moon) {
        scene.add.circle(GAME_WIDTH * 0.78, 40, 10, 0xddd7e6).setScrollFactor(0).setDepth(DEPTH_SKY + 1);
        scene.add.circle(GAME_WIDTH * 0.78 + 3, 37, 3, 0xb8b1c4).setScrollFactor(0).setDepth(DEPTH_SKY + 1);
      }
      if (aloft) {
        if (domes) this.domeSkyline(scene, roomWidth);
        this.clouds(scene);
        outdoor = false; // no skylines, ships or ground: only sky and cloud
      }
    }
    if (outdoor) {
      skylineTexture(scene, 'skyline_far', 180, 21, true, false);
      skylineTexture(scene, 'skyline_mid', 120, 42, false, true);
      const strips = Math.ceil((roomWidth * FAR_SCROLL + GAME_WIDTH) / SKYLINE_W) + 1;
      for (let i = 0; i < strips; i++) {
        scene.add.image(i * SKYLINE_W, horizon - 20, 'skyline_far').setOrigin(0, 1).setScrollFactor(FAR_SCROLL, 1).setTint(col(look.far)).setDepth(DEPTH_SKY + 2);
      }
      shipTexture(scene);
      const r = rng(9);
      for (let i = 0; i < 2; i++) {
        const y = 30 + r() * 50;
        const x = r() * GAME_WIDTH;
        const img = scene.add.image(x, y, 'airship').setScrollFactor(SHIP_SCROLL, 0).setTint(col(look.mid)).setDepth(DEPTH_SKY + 3);
        const light = scene.add.rectangle(x + 30, y + 13, 2, 2, 0xd4283e).setScrollFactor(SHIP_SCROLL, 0).setDepth(DEPTH_SKY + 3);
        this.ships.push({ img, light, speed: 4 + r() * 5, baseX: x });
      }
      // Below the street line: the dark river / far ground, so nothing shows sky under bridges.
      scene.add.rectangle(0, horizon - 4, roomWidth, 2000, col(look.mid)).setOrigin(0, 0).setDepth(DEPTH_SKY + 4);
      scene.add.rectangle(0, horizon + 24, roomWidth, 2000, 0x1c1826).setOrigin(0, 0).setDepth(DEPTH_SKY + 4);
      const midStrips = Math.ceil((roomWidth * MID_SCROLL + GAME_WIDTH) / SKYLINE_W) + 1;
      for (let i = 0; i < midStrips; i++) {
        scene.add.image(i * SKYLINE_W, horizon - 4, 'skyline_mid').setOrigin(0, 1).setScrollFactor(MID_SCROLL, 1).setTint(col(look.mid)).setDepth(DEPTH_SKY + 4);
      }
    }
    // Vignette: darker screen edges give depth (one canvas texture, drawn once).
    if (!scene.textures.exists('vignette')) {
      const tex = scene.textures.createCanvas('vignette', GAME_WIDTH, GAME_HEIGHT);
      const ctx = tex?.getContext();
      if (tex && ctx) {
        const g = ctx.createRadialGradient(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_HEIGHT * 0.35, GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 0.62);
        g.addColorStop(0, 'rgba(11,10,16,0)');
        g.addColorStop(1, 'rgba(11,10,16,0.55)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        tex.refresh();
      }
    }
    if (scene.textures.exists('vignette')) scene.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(DEPTH_OVERLAY + 5);
    if (look.overlay) {
      scene.add
        .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, col(look.overlay))
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setBlendMode(Phaser.BlendModes.MULTIPLY)
        .setDepth(DEPTH_OVERLAY);
    }
  }

  update(dtMs: number): void {
    this.t += dtMs;
    for (const s of this.ships) {
      const x = s.baseX + ((this.t / 1000) * s.speed) % (GAME_WIDTH + 128) - 64;
      const wrapped = x > GAME_WIDTH + 64 ? x - GAME_WIDTH - 128 : x;
      s.img.x = wrapped;
      s.light.x = wrapped + 30;
      s.light.setVisible(Math.floor(this.t / 600) % 2 === 0);
    }
  }
}
