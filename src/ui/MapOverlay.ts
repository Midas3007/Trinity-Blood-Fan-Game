import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { CELL_COLS, CELL_ROWS, type RoomData } from '../world/tiled';

const DEPTH = 1500;
const PAD = 24;

/**
 * Full-screen map of the rooms visited so far, drawn from the world grid: rooms as framed blocks,
 * altars you have prayed at as small gold crosses (unused altars stay hidden, as in Blasphemous' map), the player as a blinking crimson dot.
 */
export class MapOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private dot: Phaser.GameObjects.Rectangle | null = null;
  private t = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH).setVisible(false);
  }

  get open(): boolean {
    return this.container.visible;
  }

  show(
    rooms: Record<string, RoomData>,
    visited: (id: string) => boolean,
    altarUsed: (room: string, id: string) => boolean,
    current: RoomData,
    px: number,
    py: number,
  ): void {
    this.container.removeAll(true);
    const s = this.scene;
    const bg = s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0a10, 0.92).setOrigin(0);
    const title = s.add.text(GAME_WIDTH / 2, 8, 'ISTVAN', { fontFamily: 'serif', fontSize: '12px', color: COLORS.text }).setOrigin(0.5, 0);
    const hint = s.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 10, 'tap MAP to close', { fontFamily: 'monospace', fontSize: '8px', color: COLORS.textDim }).setOrigin(0.5, 1);
    this.container.add([bg, title, hint]);
    const shown = Object.values(rooms).filter((r) => visited(r.id) || r.id === current.id);
    const gx0 = Math.min(...shown.map((r) => r.gridX));
    const gy0 = Math.min(...shown.map((r) => r.gridY));
    const gx1 = Math.max(...shown.map((r) => r.gridX + r.cols / CELL_COLS));
    const gy1 = Math.max(...shown.map((r) => r.gridY + r.rows / CELL_ROWS));
    // one screen cell in map pixels, fitted to the overlay and kept 30:17
    const cw = Math.min((GAME_WIDTH - PAD * 2) / (gx1 - gx0), ((GAME_HEIGHT - PAD * 2) / (gy1 - gy0)) * (30 / 17), 40);
    const ch = (cw * 17) / 30;
    const ox = (GAME_WIDTH - (gx1 - gx0) * cw) / 2;
    const oy = (GAME_HEIGHT - (gy1 - gy0) * ch) / 2;
    for (const r of shown) {
      const x = ox + (r.gridX - gx0) * cw;
      const y = oy + (r.gridY - gy0) * ch;
      const w = (r.cols / CELL_COLS) * cw;
      const h = (r.rows / CELL_ROWS) * ch;
      const here = r.id === current.id;
      this.container.add(s.add.rectangle(x + 1, y + 1, w - 2, h - 2, here ? 0x41324f : 0x2e2836).setOrigin(0).setStrokeStyle(1, here ? 0xc4a04a : 0x6f6676));
      // the room's own walls and floors in miniature
      const sx = w / r.width;
      const sy = h / r.height;
      for (const s0 of [...r.solids, ...r.oneways]) {
        const rw = Math.max(1, s0.w * sx);
        const rh = Math.max(1, s0.h * sy);
        this.container.add(s.add.rectangle(x + s0.x * sx, y + s0.y * sy, rw, rh, here ? 0x8a8392 : 0x5c5464).setOrigin(0));
      }
      for (const c of r.checkpoints) {
        if (!altarUsed(r.id, c.id)) continue;
        const ax = Math.round(x + (c.x / r.width) * w);
        const ay = Math.round(y + (c.y / r.height) * h) - 5;
        this.container.add(s.add.rectangle(ax, ay, 4, 9, 0x0b0a10).setOrigin(0.5)); // dark backing so it reads on any room
        this.container.add(s.add.rectangle(ax, ay, 2, 7, 0xe8c86a).setOrigin(0.5));
        this.container.add(s.add.rectangle(ax, ay - 1, 6, 2, 0xe8c86a).setOrigin(0.5));
      }
      if (here) {
        this.dot = s.add.rectangle(x + (px / r.width) * w, y + (py / r.height) * h, 3, 3, 0xd4283e);
        this.container.add(this.dot);
      }
    }
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  update(dtMs: number): void {
    if (!this.open || !this.dot) return;
    this.t += dtMs;
    this.dot.setVisible(Math.floor(this.t / 300) % 2 === 0);
  }
}
