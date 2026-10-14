import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { emptyFrame, type Action, type InputFrame } from '../systems/input/actions';
import { stickVector, type Vec2 } from '../systems/input/stick';
import { buttonAt, STICK_ZONE_TOP, STICK_ZONE_WIDTH, type ButtonLayout, type TouchLayout } from './touchLayout';

const UI_DEPTH = 1000;
const IDLE_ALPHA = 0.35;
const PRESSED_ALPHA = 0.75;

interface ButtonView {
  layout: ButtonLayout;
  circle: Phaser.GameObjects.Arc;
}

/**
 * Multitouch on-screen controls: a fixed stick on the left and action buttons on the right.
 * Each touch is tracked by pointer id, so moving and pressing buttons work at the same time.
 */
export class TouchControls {
  private stickPointerId: number | null = null;
  private stickVec: Vec2 = { x: 0, y: 0 };
  /** pointer id -> action it is currently holding */
  private buttonPointers = new Map<number, Action>();
  /** Buttons pressed since the last read(), so a very quick tap is never lost between frames. */
  private tappedSinceRead = new Set<Action>();
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly buttons: ButtonView[];
  private readonly stickX: number;
  private readonly stickY: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layout: TouchLayout,
  ) {
    const { stick } = layout;
    this.stickX = stick.x * GAME_WIDTH;
    this.stickY = stick.y * GAME_HEIGHT;

    scene.add
      .circle(this.stickX, this.stickY, stick.radius, COLORS.player, 0.12)
      .setStrokeStyle(1, COLORS.player, IDLE_ALPHA)
      .setScrollFactor(0)
      .setDepth(UI_DEPTH);
    this.knob = scene.add
      .circle(this.stickX, this.stickY, stick.knobRadius, COLORS.player, IDLE_ALPHA)
      .setScrollFactor(0)
      .setDepth(UI_DEPTH + 1);

    this.buttons = layout.buttons.map((b) => {
      const x = b.x * GAME_WIDTH;
      const y = b.y * GAME_HEIGHT;
      const circle = scene.add
        .circle(x, y, b.radius, COLORS.accent, IDLE_ALPHA)
        .setStrokeStyle(1, COLORS.player, IDLE_ALPHA)
        .setScrollFactor(0)
        .setDepth(UI_DEPTH);
      scene.add
        .text(x, y, b.label, { fontFamily: 'monospace', fontSize: '8px', color: COLORS.text })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(UI_DEPTH + 1);
      return { layout: b, circle };
    });

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  read(): InputFrame {
    const f = emptyFrame();
    f.moveX = this.stickVec.x;
    f.moveY = this.stickVec.y;
    for (const action of this.buttonPointers.values()) f.buttons[action] = true;
    for (const action of this.tappedSinceRead) f.buttons[action] = true;
    this.tappedSinceRead.clear();
    return f;
  }

  /** Releases every touch (used when the game is paused or hidden). */
  releaseAll(): void {
    this.stickPointerId = null;
    this.stickVec = { x: 0, y: 0 };
    this.buttonPointers.clear();
    this.tappedSinceRead.clear();
    this.refreshVisuals();
  }

  private onDown(p: Phaser.Input.Pointer): void {
    const inStickZone = p.x < GAME_WIDTH * STICK_ZONE_WIDTH && p.y > GAME_HEIGHT * STICK_ZONE_TOP;
    if (this.stickPointerId === null && inStickZone) {
      this.stickPointerId = p.id;
      this.updateStick(p);
    } else {
      const b = buttonAt(this.layout.buttons, p.x, p.y, GAME_WIDTH, GAME_HEIGHT);
      if (b) {
        this.buttonPointers.set(p.id, b.action);
        this.tappedSinceRead.add(b.action);
      }
    }
    this.refreshVisuals();
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id === this.stickPointerId) {
      this.updateStick(p);
    } else if (this.buttonPointers.has(p.id)) {
      // Allow sliding a thumb from one button to another; sliding off everything keeps the last button.
      const b = buttonAt(this.layout.buttons, p.x, p.y, GAME_WIDTH, GAME_HEIGHT);
      if (b) this.buttonPointers.set(p.id, b.action);
    }
    this.refreshVisuals();
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.stickPointerId) {
      this.stickPointerId = null;
      this.stickVec = { x: 0, y: 0 };
    }
    this.buttonPointers.delete(p.id);
    this.refreshVisuals();
  }

  private updateStick(p: Phaser.Input.Pointer): void {
    const { radius, deadZone } = this.layout.stick;
    this.stickVec = stickVector(p.x - this.stickX, p.y - this.stickY, radius, deadZone);
  }

  private refreshVisuals(): void {
    const { radius } = this.layout.stick;
    const active = this.stickPointerId !== null;
    this.knob.setPosition(this.stickX + this.stickVec.x * radius, this.stickY + this.stickVec.y * radius);
    this.knob.setFillStyle(COLORS.player, active ? PRESSED_ALPHA : IDLE_ALPHA);
    const held = new Set(this.buttonPointers.values());
    for (const v of this.buttons) {
      v.circle.setFillStyle(COLORS.accent, held.has(v.layout.action) ? PRESSED_ALPHA : IDLE_ALPHA);
    }
  }

  private destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }
}
