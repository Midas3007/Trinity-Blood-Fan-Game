import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { emptyFrame, type Action, type InputFrame } from '../systems/input/actions';
import { stickUpJump, stickVector, type Vec2 } from '../systems/input/stick';
import { drawKnob, drawMedallion, drawStickBase } from './buttonArt';
import { buttonAt, STICK_ZONE_TOP, STICK_ZONE_WIDTH, type ButtonLayout, type TouchLayout } from './touchLayout';

const UI_DEPTH = 1000;
/** The label under each button's icon. */
const LABEL_STYLE = { fontFamily: 'serif', fontStyle: 'bold', fontSize: '7px', color: '#eadfc4', stroke: '#0b0a10', strokeThickness: 2 };

interface ButtonView {
  layout: ButtonLayout;
  art: Phaser.GameObjects.Graphics;
  held: boolean;
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
  private knob!: Phaser.GameObjects.Graphics;
  private knobHeld = false;
  private buttons: ButtonView[] = [];
  private stickX = 0;
  private stickY = 0;
  private parts: Phaser.GameObjects.GameObject[] = [];
  private shown = true;
  /** Test mode only (trailer footage): stay hidden whatever the menus do. */
  forceHidden = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private layout: TouchLayout,
  ) {
    this.build();
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.adoptHeldPointers();
  }

  /** Draws the stick and buttons for the current layout. */
  private build(): void {
    const scene = this.scene;
    const { stick } = this.layout;
    this.stickX = stick.x * GAME_WIDTH;
    this.stickY = stick.y * GAME_HEIGHT;
    const ring = scene.add.graphics().setPosition(this.stickX, this.stickY).setScrollFactor(0).setDepth(UI_DEPTH);
    drawStickBase(ring, stick.radius);
    this.knob = scene.add.graphics().setPosition(this.stickX, this.stickY).setScrollFactor(0).setDepth(UI_DEPTH + 1);
    drawKnob(this.knob, stick.knobRadius, false);
    this.knobHeld = false;
    this.parts = [ring, this.knob];
    this.buttons = this.layout.buttons.map((b) => {
      const x = b.x * GAME_WIDTH;
      const y = b.y * GAME_HEIGHT;
      const art = scene.add.graphics().setPosition(x, y).setScrollFactor(0).setDepth(UI_DEPTH);
      drawMedallion(art, b.radius, b.action, false);
      const label = scene.add
        .text(x, y + b.radius * 0.56, b.label, LABEL_STYLE)
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(UI_DEPTH + 1)
        .setAlpha(0.9);
      this.parts.push(art, label);
      return { layout: b, art, held: false };
    });
    for (const p of this.parts) (p as unknown as Phaser.GameObjects.Components.Visible).setVisible(this.shown);
  }

  /** The player moved or resized the controls (Options → Touch layout): redraw them. */
  relayout(layout: TouchLayout): void {
    for (const p of this.parts) p.destroy();
    this.layout = layout;
    this.releaseAll();
    this.build();
  }

  get currentLayout(): TouchLayout {
    return this.layout;
  }

  /** Hidden while the layout editor shows its own copies. */
  setVisible(on: boolean): void {
    if (this.forceHidden) on = false;
    this.shown = on;
    for (const p of this.parts) (p as unknown as Phaser.GameObjects.Components.Visible).setVisible(on);
  }

  read(): InputFrame {
    const f = emptyFrame();
    f.moveX = this.stickVec.x;
    f.moveY = this.stickVec.y;
    for (const action of this.buttonPointers.values()) f.buttons[action] = true;
    for (const action of this.tappedSinceRead) f.buttons[action] = true;
    if (stickUpJump(this.stickVec.y, this.layout.stick.upJumpThreshold)) f.buttons.jump = true;
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

  /**
   * Fingers already on the screen when the controls are created (e.g. holding the stick through a room change)
   * keep working: the stick is picked up again and held buttons stay held, without counting as a new tap.
   */
  private adoptHeldPointers(): void {
    for (const p of this.scene.input.manager.pointers) {
      if (!p.isDown) continue;
      const inStickZone = this.inStickZone(p.x, p.y);
      if (this.stickPointerId === null && inStickZone) {
        this.stickPointerId = p.id;
        this.updateStick(p);
      } else {
        const b = buttonAt(this.layout.buttons, p.x, p.y, GAME_WIDTH, GAME_HEIGHT);
        if (b) this.buttonPointers.set(p.id, b.action);
      }
    }
    this.refreshVisuals();
  }

  /** The default left-hand zone, or anywhere near the stick if the player has moved it. */
  private inStickZone(x: number, y: number): boolean {
    if (buttonAt(this.layout.buttons, x, y, GAME_WIDTH, GAME_HEIGHT)) return false;
    const near = Math.hypot(x - this.stickX, y - this.stickY) <= this.layout.stick.radius * 2.5;
    return near || (x < GAME_WIDTH * STICK_ZONE_WIDTH && y > GAME_HEIGHT * STICK_ZONE_TOP);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.shown) return;
    const inStickZone = this.inStickZone(p.x, p.y);
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
    if (active !== this.knobHeld) {
      this.knobHeld = active;
      drawKnob(this.knob, this.layout.stick.knobRadius, active);
    }
    const held = new Set(this.buttonPointers.values());
    for (const v of this.buttons) {
      const on = held.has(v.layout.action);
      if (on === v.held) continue; // redraw only on change
      v.held = on;
      drawMedallion(v.art, v.layout.radius, v.layout.action, on);
    }
  }

  private destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }
}
