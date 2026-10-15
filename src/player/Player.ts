import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import type { ActionState } from '../systems/input/ActionState';
import { AttackRunner } from '../combat/AttackRunner';
import { attackTable } from '../combat/attackData';
import { centredRect, overlaps } from '../combat/geometry';
import { Health } from '../combat/Health';
import { nextEntityId } from '../combat/ids';
import type { HitInfo, Rect } from '../combat/types';
import type { PlayerCombatant } from '../combat/CombatSystem';
import { StateMachine } from './StateMachine';
import { PlayerTimers } from './PlayerTimers';
import { gravityFor } from './movement';
import { playerStates, postureFor, type PlayerContext, type PlayerStateKey, type Posture } from './playerStates';
import { playerTuning, type PlayerTuning } from './tuning';

const INVULNERABLE_ALPHA = 0.45;
/** Blink period while invulnerable after being hurt (ms). */
const BLINK_MS = 80;

/** Placeholder player: a rectangle with an Arcade body driven by the player state machine. */
export class Player implements PlayerContext, PlayerCombatant {
  readonly id = nextEntityId();
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly tuning: PlayerTuning = playerTuning;
  readonly timers = new PlayerTimers(playerTuning);
  readonly combat = new AttackRunner(attackTable);
  readonly health = new Health(playerTuning.maxHealth);
  facing: 1 | -1 = 1;
  jumpCut = false;
  fallDistance = 0;
  private airTopY: number;
  private height: number;
  canStand = true;
  private blinkMs = 0;
  private readonly fsm: StateMachine<PlayerStateKey, PlayerContext>;
  private readonly facingMark: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly input: ActionState,
    private readonly worldGravity: number,
    private readonly solids: readonly Rect[],
  ) {
    const t = this.tuning;
    this.height = t.height;
    this.sprite = scene.add.rectangle(x, y, t.width, t.height, COLORS.player);
    // Small mark showing which way the player faces (placeholder art).
    this.facingMark = scene.add.rectangle(x, y, 4, 4, COLORS.accent);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocityY(t.maxFallSpeed);
    this.airTopY = y;
    this.fsm = new StateMachine(playerStates, 'idle', this as PlayerContext);
  }

  get state(): PlayerStateKey {
    return this.fsm.current;
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  get onGround(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  get moveX(): number {
    return this.input.moveX;
  }

  get jumpHeld(): boolean {
    return this.input.isDown('jump');
  }

  get dodgePressed(): boolean {
    return this.input.justPressed('dodge');
  }

  get attackPressed(): boolean {
    return this.input.justPressed('attack');
  }

  get crouchHeld(): boolean {
    return this.input.moveY >= this.tuning.crouchStickThreshold;
  }

  /** Current body height (changes with posture). */
  get bodyHeight(): number {
    return this.height;
  }

  /** y of the player's feet. */
  get feetY(): number {
    return this.sprite.y + this.height / 2;
  }

  /** Would a standing body fit here without overlapping any solid? */
  private roomToStand(): boolean {
    const h = this.tuning.height;
    const r = centredRect(this.x, this.feetY - h / 2, this.tuning.width - 2, h - 1);
    return !this.solids.some((s) => overlaps(r, s));
  }

  private heightFor(p: Posture): number {
    if (p === 'roll') return this.tuning.rollHeight;
    if (p === 'low') return this.tuning.lowHeight;
    return this.tuning.height;
  }

  /** Resizes the body (and placeholder) for the posture, keeping the feet in place. */
  private applyPosture(p: Posture): void {
    let h = this.heightFor(p);
    if (h > this.height && !this.roomToStand()) h = this.height; // never grow into a ceiling
    if (h === this.height) return;
    const feet = this.feetY;
    const w = this.tuning.width;
    this.height = h;
    // Change the real size (not scale) and sync the body immediately, so it never overlaps the floor for a frame.
    this.sprite.setSize(w, h);
    this.sprite.updateDisplayOrigin();
    this.sprite.setPosition(this.sprite.x, feet - h / 2);
    this.body.setSize(w, h);
    this.body.updateFromGameObject();
    // Arcade moves the shape by (position - previous position) after each step. Resizing moved the body's
    // top edge, so mark the new position as the previous one or the shape gets dragged into the floor.
    this.body.prev.copy(this.body.position);
    this.body.prevFrame.copy(this.body.position);
  }

  get vx(): number {
    return this.body.velocity.x;
  }

  set vx(v: number) {
    this.body.setVelocityX(v);
  }

  get vy(): number {
    return this.body.velocity.y;
  }

  set vy(v: number) {
    this.body.setVelocityY(v);
  }

  get invulnerable(): boolean {
    return this.timers.invulnerable > 0;
  }

  hurtbox(): Rect {
    return centredRect(this.x, this.y, this.tuning.width, this.height);
  }

  get alive(): boolean {
    return !this.health.dead;
  }

  receiveHit(hit: HitInfo): boolean {
    return this.takeHit(hit);
  }

  /** Applies a hit unless invulnerable or dead. Returns true if it landed. */
  takeHit(hit: HitInfo): boolean {
    if (this.invulnerable || this.health.dead) return false;
    this.health.damage(hit.damage);
    this.timers.invulnerable = this.tuning.hurtInvulnerableMs;
    this.blinkMs = this.tuning.hurtInvulnerableMs;
    this.vx = hit.knockbackX;
    this.vy = -hit.knockbackY;
    if (hit.knockbackX !== 0) this.facing = hit.knockbackX > 0 ? -1 : 1; // face the attacker
    this.fsm.transition('hurt');
    return true;
  }

  /** Puts the player back at a spawn point with full health (placeholder for checkpoints). */
  respawn(x: number, y: number): void {
    this.applyPosture('stand');
    this.sprite.setPosition(x, y);
    this.body.reset(x, y);
    this.health.reset();
    this.timers.invulnerable = this.tuning.hurtInvulnerableMs;
    this.blinkMs = this.tuning.hurtInvulnerableMs;
    this.airTopY = y;
    this.fsm.transition('idle');
  }

  update(dtMs: number): void {
    const y = this.sprite.y;
    if (!this.onGround) this.airTopY = Math.min(this.airTopY, y);
    this.fallDistance = y - this.airTopY;

    this.timers.tick({
      dtMs,
      jumpPressed: this.input.justPressed('jump'),
      onGround: this.onGround,
      velocityY: this.vy,
    });
    this.canStand = this.height >= this.tuning.height || this.roomToStand();
    this.fsm.update(dtMs);
    this.applyPosture(postureFor(this.fsm.current));

    if (this.onGround) this.airTopY = y;
    // World gravity is already applied; add the difference for the current phase of the jump.
    this.body.setGravityY(gravityFor(this.vy, this.tuning) - this.worldGravity);

    this.blinkMs = Math.max(0, this.blinkMs - dtMs);
    const blinkOff = this.blinkMs > 0 && Math.floor(this.blinkMs / BLINK_MS) % 2 === 0;
    this.sprite.setAlpha(blinkOff ? 0.2 : this.invulnerable ? INVULNERABLE_ALPHA : 1);
    this.facingMark.setPosition(this.sprite.x + this.facing * (this.tuning.width / 2 - 2), this.sprite.y - this.height / 2 + 7);
  }
}
