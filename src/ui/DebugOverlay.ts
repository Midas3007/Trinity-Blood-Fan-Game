import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import { TapCounter } from '../systems/input/TapCounter';
import type { Rect } from '../combat/types';

export interface DebugInfo {
  state: string;
  vel: string;
  x: number;
  y: number;
  input: string;
  hp: string;
}

export interface DebugToggleConfig {
  taps: number;
  windowMs: number;
  cornerSize: number;
}

/**
 * FPS, player state, position and held inputs, plus Arcade body outlines (hitboxes).
 * Toggle: triple-tap the top-left corner on phone, or the backtick key on desktop.
 */
export class DebugOverlay {
  private visible = false;
  private readonly text: Phaser.GameObjects.Text;
  private readonly taps: TapCounter;
  private readonly boxes: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly toggle: DebugToggleConfig,
  ) {
    this.text = scene.add
      .text(4, 18, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: COLORS.text,
        backgroundColor: '#000000aa',
        padding: { x: 2, y: 2 },
      })
      .setScrollFactor(0)
      .setDepth(2000)
      .setVisible(false);
    this.taps = new TapCounter(toggle.taps, toggle.windowMs);
    this.boxes = scene.add.graphics().setDepth(1999);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    scene.input.keyboard?.on('keydown-BACKTICK', this.flip, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
      scene.input.keyboard?.off('keydown-BACKTICK', this.flip, this);
    });
  }

  /** Outlines active attack hitboxes (world space). */
  drawHitboxes(rects: readonly Rect[]): void {
    this.boxes.clear();
    if (!this.visible) return;
    this.boxes.lineStyle(1, COLORS.hitbox, 1);
    for (const r of rects) this.boxes.strokeRect(r.x, r.y, r.w, r.h);
  }

  update(info: DebugInfo): void {
    if (!this.visible) return;
    const fps = this.scene.game.loop.actualFps.toFixed(0);
    this.text.setText(
      [`fps ${fps}`, `state ${info.state}`, `pos ${info.x.toFixed(0)},${info.y.toFixed(0)}`, `vel ${info.vel}`, `in ${info.input}`, `hp ${info.hp}`].join(
        '\n',
      ),
    );
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    const { cornerSize } = this.toggle;
    if (p.x <= cornerSize && p.y <= cornerSize && this.taps.tap(p.downTime)) this.flip();
  }

  private flip(): void {
    this.visible = !this.visible;
    this.text.setVisible(this.visible);
    const world = this.scene.physics.world;
    world.drawDebug = this.visible;
    if (this.visible && !world.debugGraphic) world.createDebugGraphic();
    world.debugGraphic?.setVisible(this.visible);
    if (!this.visible) world.debugGraphic?.clear();
  }
}
