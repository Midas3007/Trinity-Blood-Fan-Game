import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import { centredRect } from '../combat/geometry';
import { Health } from '../combat/Health';
import { nextEntityId } from '../combat/ids';
import type { Damageable, HitInfo, Rect } from '../combat/types';
import effects from '../data/effects.json';

export interface DummyConfig {
  x: number;
  maxHealth: number;
  /** Damage dealt to the player on touch; 0 = harmless punching bag. */
  contactDamage: number;
  respawnMs: number;
}

const WIDTH = 16;
const HEIGHT = 28;
const DRAG_X = 600;
const BAR_W = 18;
const CONTACT_KNOCKBACK_X = 160;
const CONTACT_KNOCKBACK_Y = 150;
const CONTACT_HITSTOP_MS = 70;
const CONTACT_SHAKE_MS = 100;
const CONTACT_SHAKE = 0.004;

/** Placeholder target for combat testing (not an enemy AI; that is Milestone 4). */
export class TrainingDummy implements Damageable {
  readonly id = nextEntityId();
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly health: Health;
  private readonly bar: Phaser.GameObjects.Rectangle;
  private readonly baseColor: number;
  private flashMs = 0;
  private respawnInMs = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly cfg: DummyConfig,
    private readonly floorY: number,
  ) {
    this.health = new Health(cfg.maxHealth);
    this.baseColor = cfg.contactDamage > 0 ? COLORS.accent : COLORS.stone;
    this.sprite = scene.add.rectangle(cfg.x, floorY - HEIGHT / 2, WIDTH, HEIGHT, this.baseColor);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setDragX(DRAG_X);
    this.body.setCollideWorldBounds(true);
    this.bar = scene.add.rectangle(cfg.x, 0, BAR_W, 2, COLORS.accent).setOrigin(0, 0.5);
  }

  get alive(): boolean {
    return !this.health.dead;
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  get contactDamage(): number {
    return this.cfg.contactDamage;
  }

  hurtbox(): Rect {
    return centredRect(this.x, this.y, WIDTH, HEIGHT);
  }

  /** The hit this dummy deals on touch, pushing the player away from it. */
  contactHit(targetX: number): HitInfo {
    const dir = targetX >= this.x ? 1 : -1;
    return {
      damage: this.cfg.contactDamage,
      knockbackX: dir * CONTACT_KNOCKBACK_X,
      knockbackY: CONTACT_KNOCKBACK_Y,
      hitstopMs: CONTACT_HITSTOP_MS,
      shakeMs: CONTACT_SHAKE_MS,
      shakeIntensity: CONTACT_SHAKE,
    };
  }

  receiveHit(hit: HitInfo): boolean {
    if (!this.alive) return false;
    this.health.damage(hit.damage);
    this.body.setVelocity(hit.knockbackX, -hit.knockbackY);
    this.flashMs = effects.hitFlashMs;
    if (this.health.dead) {
      this.respawnInMs = this.cfg.respawnMs;
      this.sprite.setVisible(false);
      this.bar.setVisible(false);
      this.body.enable = false;
    }
    return true;
  }

  update(dtMs: number): void {
    if (!this.alive) {
      this.respawnInMs -= dtMs;
      if (this.respawnInMs <= 0) this.respawn();
      return;
    }
    this.flashMs = Math.max(0, this.flashMs - dtMs);
    this.sprite.setFillStyle(this.flashMs > 0 ? COLORS.flash : this.baseColor);
    this.bar.setPosition(this.x - BAR_W / 2, this.y - HEIGHT / 2 - 4);
    this.bar.width = BAR_W * this.health.fraction;
  }

  private respawn(): void {
    this.health.reset();
    this.body.enable = true;
    this.body.reset(this.cfg.x, this.floorY - HEIGHT / 2);
    this.sprite.setVisible(true);
    this.bar.setVisible(true);
  }
}
