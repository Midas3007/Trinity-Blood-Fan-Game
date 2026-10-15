import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import { AttackRunner } from '../combat/AttackRunner';
import { centredRect } from '../combat/geometry';
import { Health } from '../combat/Health';
import { nextEntityId } from '../combat/ids';
import type { Damageable, HitInfo, Rect } from '../combat/types';
import { StateMachine } from '../player/StateMachine';
import effects from '../data/effects.json';
import type { EnemyConfig } from './enemyConfig';
import { enemyStates, type EnemyContext, type EnemyStateKey, type EnemyTarget } from './enemyStates';
import { groundAheadOf } from './sensing';

const STRING_LENGTH = 60;
const ALERT_MARK_OFFSET = 10;
const BAR_W = 18;

/**
 * One pooled enemy. Created once (hidden), then `spawn`ed and `despawn`ed many times.
 * Behaviour lives in enemyStates; this class only connects it to Phaser.
 */
export class Enemy implements EnemyContext, Damageable {
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly combat: AttackRunner;
  readonly health: Health;
  id = nextEntityId();
  homeX = 0;
  facing: 1 | -1 = -1;
  attackCooldown = 0;
  patrolDir: 1 | -1 = 1;
  /** ms left of the death collapse; the manager releases the enemy when it reaches 0. */
  private dyingMs = 0;
  private flashMs = 0;
  private fsm: StateMachine<EnemyStateKey, EnemyContext> | null = null;
  private readonly string: Phaser.GameObjects.Rectangle;
  private readonly mark: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    readonly cfg: EnemyConfig,
    readonly target: EnemyTarget,
    private readonly solids: readonly Rect[],
  ) {
    this.combat = new AttackRunner(cfg.attacks);
    this.health = new Health(cfg.maxHealth);
    // The puppet string rising from the thrall's head (placeholder art for the "string-bound" look).
    this.string = scene.add.rectangle(0, 0, 1, STRING_LENGTH, COLORS.accent, 0.8).setOrigin(0.5, 1);
    this.sprite = scene.add.rectangle(0, 0, cfg.width, cfg.height, cfg.color);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.mark = scene.add
      .text(0, 0, '!', { fontFamily: 'monospace', fontSize: '10px', color: COLORS.text })
      .setOrigin(0.5, 1);
    this.bar = scene.add.rectangle(0, 0, BAR_W, 2, COLORS.accent).setOrigin(0, 0.5);
    this.setActive(false);
  }

  // --- EnemyContext ---
  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
  get vx(): number {
    return this.body.velocity.x;
  }
  set vx(v: number) {
    this.body.setVelocityX(v);
  }
  get groundAhead(): boolean {
    return groundAheadOf(this.x, this.y + this.cfg.height / 2, this.cfg.width, this.facing, this.solids);
  }
  get wallAhead(): boolean {
    return this.facing === 1 ? this.body.blocked.right : this.body.blocked.left;
  }

  // --- Damageable ---
  get alive(): boolean {
    return this.fsm !== null && !this.health.dead;
  }

  get state(): EnemyStateKey | 'inactive' {
    return this.fsm?.current ?? 'inactive';
  }

  /** True once the death collapse has finished and the enemy can go back to the pool. */
  get finished(): boolean {
    return this.state === 'dead' && this.dyingMs <= 0;
  }

  hurtbox(): Rect {
    return centredRect(this.x, this.y, this.cfg.width, this.cfg.height);
  }

  receiveHit(hit: HitInfo): boolean {
    if (!this.fsm || !this.alive) return false;
    this.health.damage(hit.damage);
    this.flashMs = effects.hitFlashMs;
    if (this.health.dead) {
      this.dyingMs = this.cfg.deathMs;
      this.body.setVelocity(hit.knockbackX * this.cfg.knockbackTaken, 0);
      this.fsm.transition('dead');
      return true;
    }
    // Super armour: some enemies keep swinging when hit during the active part of their attack.
    const armoured = this.state === 'attack' && this.combat.phase === 'active' && !this.cfg.interruptibleDuringActive;
    if (armoured) return true;
    this.body.setVelocity(hit.knockbackX * this.cfg.knockbackTaken, -hit.knockbackY * this.cfg.knockbackTaken);
    if (hit.knockbackX !== 0) this.facing = hit.knockbackX > 0 ? -1 : 1; // turn toward the attacker
    this.fsm.transition('hurt');
    return true;
  }

  spawn(x: number, feetY: number): void {
    this.id = nextEntityId(); // fresh id so old "already hit" records never apply
    this.homeX = x;
    this.health.reset();
    this.attackCooldown = 0;
    this.dyingMs = 0;
    this.flashMs = 0;
    this.patrolDir = Math.random() < 0.5 ? 1 : -1;
    this.facing = this.patrolDir;
    const y = feetY - this.cfg.height / 2;
    this.setActive(true);
    this.sprite.setPosition(x, y).setAlpha(1).setScale(1);
    this.body.reset(x, y);
    this.fsm = new StateMachine(enemyStates, 'idle', this as EnemyContext);
  }

  despawn(): void {
    this.fsm = null;
    this.combat.stop();
    this.setActive(false);
  }

  update(dtMs: number): void {
    if (!this.fsm) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - dtMs);
    this.flashMs = Math.max(0, this.flashMs - dtMs);
    this.fsm.update(dtMs);
    this.render(dtMs);
  }

  private render(dtMs: number): void {
    const state = this.state;
    const telegraph = state === 'attack' && this.combat.phase === 'startup';
    const color = this.flashMs > 0 ? COLORS.flash : telegraph ? this.cfg.telegraphColor : this.cfg.color;
    this.sprite.setFillStyle(color);
    const top = this.y - this.cfg.height / 2;
    this.string.setPosition(this.x, top).setVisible(state !== 'dead');
    this.mark.setPosition(this.x, top - ALERT_MARK_OFFSET).setVisible(state === 'alert');
    this.bar.setPosition(this.x - BAR_W / 2, top - 4).setVisible(state !== 'dead' && this.health.fraction < 1);
    this.bar.width = BAR_W * this.health.fraction;
    if (state === 'dead') {
      // Collapse: the body sinks and fades as the string is cut.
      this.dyingMs = Math.max(0, this.dyingMs - dtMs);
      const t = this.dyingMs / this.cfg.deathMs;
      this.sprite.setAlpha(t).setScale(1, Math.max(0.2, t));
    }
  }

  private setActive(on: boolean): void {
    this.sprite.setVisible(on);
    this.body.enable = on;
    this.string.setVisible(on);
    this.mark.setVisible(false);
    this.bar.setVisible(false);
  }
}
