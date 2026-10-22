import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TITLE_FONT } from '../core/constants';
import { CELL_COLS, CELL_ROWS, type RoomData } from '../world/tiled';
import { areaOf, mapAreas, mapCell, regionOf } from '../world/mapStyle';
import { GothicButton } from './GothicButton';
import { centreOn, clampView, layerTransform, screenToMap, zoomView, type MapView, type MapViewport } from './mapView';

const DEPTH = 1500;
const PAD = 18;
/** Space for the title above the map and the legend below it (px). */
const HEADER_H = 44;
const LEGEND_H = 30;
/** Largest screen cell on the map (px). */
const MAX_CELL = 40;
const LADDER = 0xb08c54;
const HERE_LINE = 0xffe296;
/** How far one arrow press pans the map (px), and how far a finger may move before a tap counts as a drag. */
const PAN_STEP = 48;
const TAP_SLOP = 6;

interface ShowArgs {
  rooms: Record<string, RoomData>;
  visited: (id: string) => boolean;
  altarUsed: (room: string, id: string) => boolean;
  current: RoomData;
  px: number;
  py: number;
  hidden: (r: RoomData) => number;
  beaten: (bossId: string) => boolean;
  revealAll: boolean;
}

/**
 * Full-screen map of the rooms visited so far in the city Abel is in, styled like the poster (tools/social/map.py):
 * each region in its own colours with the rooms' walls in miniature, ladders, gold crosses for altars you have prayed at
 * (altars not yet prayed at show dim), crimson seals for bosses, blue diamonds where something is still
 * hidden, and Abel as a blinking crimson dot. Tap a room to read its name.
 * + and − zoom, the arrows (or a drag) look around, CITY switches between the cities you have been to. With the cheat
 * on, every room is drawn, explored or not (owner). Taps are read from one full-screen zone in screen coordinates
 * (a Container's scroll factor does not move its children's tap areas).
 */
export class MapOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private dot: Phaser.GameObjects.Rectangle | null = null;
  private caption: Phaser.GameObjects.Text | null = null;
  private t = 0;
  private readonly layer: Phaser.GameObjects.Container;
  private readonly hit: Phaser.GameObjects.Zone;
  private readonly buttons: GothicButton[] = [];
  private readonly cityButton: GothicButton;
  private readonly vp: MapViewport = { x: PAD, y: HEADER_H, w: GAME_WIDTH - PAD * 2, h: GAME_HEIGHT - LEGEND_H - HEADER_H };
  private view: MapView = { zoom: 1, panX: 0, panY: 0 };
  private args: ShowArgs | null = null;
  private areaId: string | null = null;
  private roomRects: { x: number; y: number; w: number; h: number; title: string }[] = [];
  private drag: { x: number; y: number; moved: number } | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    this.layer = scene.add.container(0, 0);
    const clip = scene.make.graphics({}, false).setScrollFactor(0);
    clip.fillStyle(0xffffff).fillRect(this.vp.x - PAD, this.vp.y, this.vp.w + PAD * 2, this.vp.h);
    this.layer.setMask(clip.createGeometryMask());
    this.hit = scene.add.zone(0, this.vp.y, GAME_WIDTH, this.vp.h).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 1);
    this.hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => (this.drag = { x: p.x, y: p.y, moved: 0 }));
    this.hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (!this.drag || !p.isDown) return;
      const dx = p.x - this.drag.x, dy = p.y - this.drag.y;
      this.drag = { x: p.x, y: p.y, moved: this.drag.moved + Math.abs(dx) + Math.abs(dy) };
      this.setView({ ...this.view, panX: this.view.panX + dx, panY: this.view.panY + dy });
    });
    this.hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (p: Phaser.Input.Pointer) => {
      if (this.drag && this.drag.moved < TAP_SLOP) this.tap(p.x, p.y);
      this.drag = null;
    });
    scene.input.on(Phaser.Input.Events.POINTER_WHEEL, (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.open) this.setView(zoomView(this.view, dy < 0 ? 1 : -1, this.vp));
    });
    const b = (x: number, y: number, label: string, fn: () => void, w = 18): GothicButton => {
      const btn = new GothicButton(scene, x, y, label, fn, w, 16, DEPTH + 3);
      this.buttons.push(btn);
      return btn;
    };
    const rx = GAME_WIDTH - 22;
    b(rx, 74, '+', () => this.setView(zoomView(this.view, 1, this.vp)));
    b(rx, 96, '−', () => this.setView(zoomView(this.view, -1, this.vp)));
    const ay = this.vp.y + this.vp.h - 46;
    b(rx - 20, ay - 18, '▲', () => this.pan(0, PAN_STEP));
    b(rx - 20, ay + 18, '▼', () => this.pan(0, -PAN_STEP));
    b(rx - 40, ay, '◀', () => this.pan(PAN_STEP, 0));
    b(rx, ay, '▶', () => this.pan(-PAN_STEP, 0));
    this.cityButton = b(44, 16, 'CITY ▸', () => this.nextCity(), 62);
    for (const btn of this.buttons) btn.setVisible(false);
  }

  private pan(dx: number, dy: number): void {
    this.setView({ ...this.view, panX: this.view.panX + dx * Math.max(1, this.view.zoom / 2), panY: this.view.panY + dy * Math.max(1, this.view.zoom / 2) });
  }

  private setView(v: MapView): void {
    this.view = clampView(v, this.vp);
    const t = layerTransform(this.view, this.vp);
    this.layer.setPosition(t.x, t.y).setScale(t.scale);
  }

  private tap(sx: number, sy: number): void {
    const m = screenToMap(sx, sy, this.view, this.vp);
    const r = this.roomRects.find((q) => m.x >= q.x && m.x < q.x + q.w && m.y >= q.y && m.y < q.y + q.h);
    if (r) this.caption?.setText(r.title);
  }

  /** The cities you can look at: those with a room you have seen (all of them with the cheat). */
  private cities(): string[] {
    const a = this.args;
    if (!a) return [];
    return mapAreas
      .filter((ar) => Object.values(a.rooms).some((r) => ar.regions.includes(regionOf(r.id)?.id ?? '') && (a.revealAll || a.visited(r.id) || r.id === a.current.id)))
      .map((ar) => ar.id);
  }

  private nextCity(): void {
    const list = this.cities();
    if (list.length < 2) return;
    this.areaId = list[(list.indexOf(this.areaId ?? '') + 1) % list.length] ?? null;
    this.render();
    this.setView({ zoom: 1, panX: 0, panY: 0 });
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
    /** Items still hidden in a room (shown on rooms you have visited, as in Blasphemous' map). */
    hidden: (r: RoomData) => number = () => 0,
    /** Bosses already beaten (their crown is drawn dim). */
    beaten: (bossId: string) => boolean = () => false,
    /** The cheat: draw every room, explored or not. */
    revealAll = false,
  ): void {
    this.args = { rooms, visited, altarUsed, current, px, py, hidden, beaten, revealAll };
    this.areaId = areaOf(current.id)?.id ?? null;
    this.render();
    const here = this.roomRects.find((r) => r.title === current.title);
    this.setView(here ? centreOn(here.x + here.w / 2, here.y + here.h / 2, 1, this.vp) : { zoom: 1, panX: 0, panY: 0 });
  }

  private render(): void {
    const a = this.args;
    if (!a) return;
    const { rooms, visited, altarUsed, current, px, py, hidden, beaten, revealAll } = a;
    this.container.remove(this.layer);   // kept: only its contents are redrawn
    this.container.removeAll(true);
    this.layer.removeAll(true);
    this.roomRects = [];
    this.dot = null;
    const s = this.scene;
    const area = mapAreas.find((ar) => ar.id === this.areaId) ?? areaOf(current.id);
    const inArea = (r: RoomData): boolean => (area ? area.regions.includes(regionOf(r.id)?.id ?? '') : true);
    const shown = Object.values(rooms).filter((r) => inArea(r) && (revealAll || visited(r.id) || r.id === current.id));
    if (shown.length === 0) return;
    const cell = (r: RoomData): { x: number; y: number } => mapCell(r.id, r.gridX, r.gridY);
    const gx0 = Math.min(...shown.map((r) => cell(r).x));
    const gy0 = Math.min(...shown.map((r) => cell(r).y));
    const gx1 = Math.max(...shown.map((r) => cell(r).x + r.cols / CELL_COLS));
    const gy1 = Math.max(...shown.map((r) => cell(r).y + r.rows / CELL_ROWS));
    const top = HEADER_H;
    const bottom = GAME_HEIGHT - LEGEND_H;
    // one screen cell in map pixels, fitted between the title and the legend and kept 30:17
    const cw = Math.min((GAME_WIDTH - PAD * 2) / (gx1 - gx0), ((bottom - top - 8) / (gy1 - gy0)) * (30 / 17), MAX_CELL);
    const ch = (cw * 17) / 30;
    const ox = (GAME_WIDTH - (gx1 - gx0) * cw) / 2;
    const oy = top + (bottom - top - (gy1 - gy0) * ch) / 2;

    // Background: near-black with a faint wine glow behind the map, as on the poster.
    this.container.add(s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0a10, 0.96).setOrigin(0));
    this.container.add(s.add.ellipse(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 0.9, GAME_HEIGHT * 0.8, 0x281a2c, 0.6));
    const title = s.add
      .text(GAME_WIDTH / 2, 6, area?.title ?? 'Istvan', { fontFamily: TITLE_FONT, fontSize: '20px', color: '#f0e2d6', stroke: '#0b0a10', strokeThickness: 3 })
      .setOrigin(0.5, 0);
    this.caption = s.add.text(GAME_WIDTH / 2, 30, inArea(current) ? current.title : '', { fontFamily: 'serif', fontStyle: 'italic', fontSize: '9px', color: '#d6aab0' }).setOrigin(0.5, 0);
    this.container.add([title, this.caption]);

    const g = s.add.graphics();
    const marks = s.add.graphics();
    this.layer.add([g, marks]);
    this.container.add(this.layer);
    for (const r of shown) {
      const reg = regionOf(r.id);
      const c = cell(r);
      const x = ox + (c.x - gx0) * cw;
      const y = oy + (c.y - gy0) * ch;
      const w = (r.cols / CELL_COLS) * cw;
      const h = (r.rows / CELL_ROWS) * ch;
      const here = r.id === current.id;
      g.fillStyle(reg?.fill ?? 0x2e2836, 1).fillRect(x, y, w, h);
      // the room's own walls and floors in miniature
      const sx = w / r.width;
      const sy = h / r.height;
      g.fillStyle(reg?.rock ?? 0x5c5464, 1);
      for (const s0 of r.solids) g.fillRect(x + s0.x * sx, y + s0.y * sy, Math.max(1, s0.w * sx), Math.max(1, s0.h * sy));
      for (const o of r.oneways) g.fillRect(x + o.x * sx, y + o.y * sy, Math.max(1, o.w * sx), 1);
      g.fillStyle(LADDER, 1);
      for (const l of r.ladders) g.fillRect(x + (l.x + l.w / 2) * sx, y + l.y * sy, 1, Math.max(1, l.h * sy));
      g.lineStyle(1, here ? HERE_LINE : (reg?.line ?? 0x6f6676), 1).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      for (const cp of r.checkpoints) {
        // Altars you have prayed at are gold; the rest of the altars in rooms you have seen show dim (owner).
        this.cross(marks, Math.round(x + cp.x * sx), Math.round(y + cp.y * sy) - 4, altarUsed(r.id, cp.id) ? 1 : 0.4);
      }
      if (r.boss) this.crown(marks, x + r.boss.x * sx, y + r.boss.y * sy - 5, beaten(r.boss.defeatFlag));
      if (hidden(r) > 0) this.diamond(marks, x + w - 5, y + 5);
      this.roomRects.push({ x, y, w, h, title: r.title });   // tap a room to read its name
      if (here) {
        this.dot = s.add.rectangle(x + px * sx, y + py * sy, 3, 3, 0xd4283e).setStrokeStyle(1, 0x0b0a10);
        this.layer.add(this.dot);
      }
    }
    this.legend(bottom);
    this.container.setVisible(true);
    this.hit.setInteractive();
    for (const btn of this.buttons) btn.setVisible(true);
    this.cityButton.setVisible(this.cities().length > 1);
  }

  /** Gold cross on a dark backing: an altar (dim until you have prayed at it). */
  private cross(g: Phaser.GameObjects.Graphics, x: number, y: number, a = 1): void {
    g.fillStyle(0x0b0a10, a).fillRect(x - 2, y - 4, 5, 9).fillRect(x - 3, y - 2, 7, 3);
    g.fillStyle(0xf0ce6e, a).fillRect(x - 1, y - 3, 2, 7).fillRect(x - 2, y - 1, 5, 1);
  }

  /** A boss: a crimson seal with a small gold crown (dim once beaten). */
  private crown(g: Phaser.GameObjects.Graphics, x: number, y: number, done: boolean): void {
    const a = done ? 0.45 : 1;
    g.fillStyle(0x0b0a10, a).fillCircle(x, y, 5);
    g.fillStyle(0xaa182e, a).fillCircle(x, y, 4);
    g.fillStyle(0xffe296, a).fillTriangle(x - 3, y + 1, x - 3, y - 2, x - 1, y).fillTriangle(x - 1, y, x, y - 3, x + 1, y).fillTriangle(x + 1, y, x + 3, y - 2, x + 3, y + 1);
    g.fillStyle(0xffe296, a).fillRect(x - 3, y, 6, 2);
  }

  /** Something still hidden in the room. */
  private diamond(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x0b0a10, 1).fillTriangle(x, y - 4, x + 4, y, x - 4, y).fillTriangle(x, y + 4, x + 4, y, x - 4, y);
    g.fillStyle(0x96dcec, 1).fillTriangle(x, y - 3, x + 3, y, x - 3, y).fillTriangle(x, y + 3, x + 3, y, x - 3, y);
  }

  /** The legend along the bottom, and how to close. */
  private legend(y0: number): void {
    const s = this.scene;
    const g = s.add.graphics();
    this.container.add(g);
    const items: { draw: (x: number, y: number) => void; text: string }[] = [
      { draw: (x, y) => this.cross(g, x, y), text: 'Altar' },
      { draw: (x, y) => this.crown(g, x, y, false), text: 'Boss' },
      { draw: (x, y) => this.diamond(g, x, y), text: 'Hidden' },
      { draw: (x, y) => g.fillStyle(LADDER, 1).fillRect(x, y - 4, 1, 9), text: 'Ladder' },
      { draw: (x, y) => g.fillStyle(0xd4283e, 1).fillRect(x - 1, y - 1, 3, 3), text: 'Abel' },
    ];
    const y = y0 + 9;
    let x = 30;
    for (const it of items) {
      it.draw(x, y);
      const t = s.add.text(x + 7, y, it.text, { fontFamily: 'serif', fontSize: '8px', color: '#e2dae6' }).setOrigin(0, 0.5);
      this.container.add(t);
      x += 16 + t.width + 10;
    }
    this.container.add(
      s.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 4, 'drag or the arrows to look round   ·   + − to zoom   ·   tap a room for its name   ·   MAP to close', { fontFamily: 'serif', fontStyle: 'italic', fontSize: '7px', color: '#8c8296' }).setOrigin(0.5, 1),
    );
  }

  hide(): void {
    this.container.setVisible(false);
    this.hit.disableInteractive();
    this.drag = null;
    for (const btn of this.buttons) btn.setVisible(false);
  }

  update(dtMs: number): void {
    if (!this.open || !this.dot) return;
    this.t += dtMs;
    this.dot.setVisible(Math.floor(this.t / 300) % 2 === 0);
  }
}
