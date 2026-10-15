import Phaser from 'phaser';
import { COLORS } from '../../core/constants';
import { centredRect } from '../../combat/geometry';
import { nextEntityId } from '../../combat/ids';
import type { ContactHazard } from '../../combat/CombatSystem';
import type { Damageable, HitInfo, Rect } from '../../combat/types';
import { SpriteView, type StateVisual } from '../../systems/sprites/SpriteView';
import { FlyerBrain, flyerConfigs } from './FlyerBrain';

const DEPTH = 9.6;
const FLASH_MS = 80;
const TELEGRAPH = 0xd9963a;
const RING = 0xc9b6e6;

function visualFor(b: FlyerBrain): StateVisual | null {
  const a = b.cfg.anim;
  if (b.cfg.attack === 'swoop') {
    if (b.state === 'attack' || b.state === 'windup' || b.state === 'dead') return { anim: `${a}_swoop` };
    return { anim: `${a}_fly`, timeScale: b.state === 'chase' ? 1.4 : 1 };
  }
  switch (b.state) {
    case 'windup':
      return { anim: `${a}_scream`, frame: 0 };
    case 'attack':
      return { anim: `${a}_scream`, frame: 1 };
    case 'hurt':
    case 'dead':
      return { anim: `${a}_hurt` };
    default:
      return { anim: `${a}_hover` };
  }
}

/** One flying creature in the scene: a target for Abel, and (bats) a contact hazard while swooping. */
class Flyer implements Damageable, ContactHazard {
  id = nextEntityId();
  private readonly view: SpriteView;
  private readonly placeholder: Phaser.GameObjects.Rectangle;
  /** Fairies: translucent insect wings drawn in code (the painted membranes were lost against the key colour). */
  private readonly wings: Phaser.GameObjects.Graphics | null;
  private flashMs = 0;
  private t = Math.random() * 1000;

  constructor(
    scene: Phaser.Scene,
    readonly brain: FlyerBrain,
  ) {
    this.view = new SpriteView(scene, visualFor(brain)?.anim ?? null, DEPTH);
    this.wings = brain.cfg.type === 'fairy' ? scene.add.graphics().setDepth(DEPTH - 0.05).setBlendMode(Phaser.BlendModes.ADD) : null;
    this.placeholder = scene.add.rectangle(0, 0, brain.cfg.width, brain.cfg.height, 0xc9c2d6).setDepth(DEPTH).setVisible(false);
  }

  get alive(): boolean {
    return this.brain.alive;
  }
  get x(): number {
    return this.brain.x;
  }
  get contactDamage(): number {
    return this.brain.contactActive ? this.brain.cfg.contactDamage : 0;
  }
  hurtbox(): Rect {
    return centredRect(this.brain.x, this.brain.y, this.brain.cfg.width, this.brain.cfg.height);
  }
  receiveHit(hit: HitInfo): boolean {
    if (!this.alive) return false;
    this.brain.takeHit(hit.damage, hit.knockbackX);
    this.flashMs = FLASH_MS;
    return true;
  }
  contactHit(targetX: number): HitInfo {
    const dir = targetX >= this.brain.x ? 1 : -1;
    return { damage: this.brain.cfg.contactDamage, knockbackX: dir * 110, knockbackY: 90, hitstopMs: 50, shakeMs: 60, shakeIntensity: 0.003 };
  }

  update(dtMs: number, px: number, py: number): void {
    this.flashMs = Math.max(0, this.flashMs - dtMs);
    const b = this.brain;
    b.update(dtMs, px, py);
    const fade = b.state === 'dead' ? Math.max(0, 1 - b.stateMs / b.cfg.deathMs) : 1;
    const feetY = b.y + b.cfg.height / 2;
    const shown = this.view.show(visualFor(b), b.x, feetY + 4, b.facing, fade);
    this.placeholder.setVisible(!shown && fade > 0).setPosition(b.x, b.y).setAlpha(fade);
    const s = this.view.sprite;
    if (s && shown) {
      s.clearTint();
      if (this.flashMs > 0) s.setTintFill(COLORS.flash);
      else if (b.state === 'windup') s.setTint(TELEGRAPH);
    }
    this.drawWings(dtMs, fade);
  }

  private drawWings(dtMs: number, fade: number): void {
    const g = this.wings;
    if (!g) return;
    g.clear();
    const b = this.brain;
    if (!b.alive && fade <= 0) return;
    this.t += dtMs;
    // A fast flutter (slower when screaming), two pairs fanning out from the shoulders, behind her.
    const beat = Math.sin(this.t / (b.state === 'attack' ? 70 : 38));
    const back = -b.facing;
    const sx = b.x + back * 2;
    const sy = b.y - b.cfg.height * 0.18;
    for (const [len, lift, w] of [[15, -0.9, 5], [11, -0.25, 4]] as const) {
      const ang = lift + beat * 0.45;
      const tipX = sx + back * Math.cos(ang) * len;
      const tipY = sy + Math.sin(ang) * len;
      const mx = (sx + tipX) / 2;
      const my = (sy + tipY) / 2;
      g.fillStyle(0xc9b6e6, 0.42 * fade);
      g.fillEllipse(mx, my, Math.max(3, Math.abs(tipX - sx)) + 2, w + Math.abs(tipY - sy) * 0.6);
      g.lineStyle(1, 0xf3ecff, 0.55 * fade).lineBetween(sx, sy, tipX, tipY);
    }
  }

  destroy(): void {
    this.view.sprite?.destroy();
    this.placeholder.destroy();
    this.wings?.destroy();
  }
}

/** A scream ring crossing Abel this frame, as a one-off contact hazard (rings can't be parried). */
class RingHit implements ContactHazard {
  readonly alive = true;
  constructor(
    private readonly box: Rect,
    readonly contactDamage: number,
    private readonly fromX: number,
  ) {}
  hurtbox(): Rect {
    return this.box;
  }
  contactHit(targetX: number): HitInfo {
    const dir = targetX >= this.fromX ? 1 : -1;
    return { damage: this.contactDamage, knockbackX: dir * 90, knockbackY: 60, hitstopMs: 40, shakeMs: 90, shakeIntensity: 0.004, parryable: false };
  }
}

/**
 * The room's flying creatures (fairies, bats). Not pooled: a handful per room, created with the room. Fallen ones
 * stay gone until the room is entered again (as in Blasphemous).
 */
export class FlyerManager {
  private readonly flyers: Flyer[] = [];
  private readonly rings: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    spawns: readonly { type: string; x: number; y: number }[],
  ) {
    for (const sp of spawns) {
      const cfg = flyerConfigs[sp.type];
      if (cfg) this.flyers.push(new Flyer(scene, new FlyerBrain(cfg, sp.x, sp.y - 40)));
    }
    this.rings = scene.add.graphics().setDepth(DEPTH + 0.1);
  }

  /** Summoned creatures (a boss calling bats): they appear at once, already hunting. */
  spawn(type: string, x: number, y: number): void {
    const cfg = flyerConfigs[type];
    if (cfg) this.flyers.push(new Flyer(this.scene, new FlyerBrain(cfg, x, y)));
  }

  get targets(): Damageable[] {
    return this.flyers.filter((f) => f.alive);
  }

  /** Swooping bats, plus any scream ring whose edge is passing over Abel right now. */
  hazards(playerBox: Rect, px: number, py: number): ContactHazard[] {
    const out: ContactHazard[] = this.flyers.filter((f) => f.alive && f.contactDamage > 0);
    for (const f of this.flyers) {
      const ring = f.brain.ringHitAt(px, py);
      if (ring && f.brain.cfg.ring) out.push(new RingHit(playerBox, f.brain.cfg.ring.damage, ring.x));
    }
    return out;
  }

  update(dtMs: number, px: number, py: number): void {
    const g = this.rings;
    g.clear();
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i]!;
      f.update(dtMs, px, py);
      const ring = f.brain.cfg.ring;
      if (ring) {
        for (const r of f.brain.rings) {
          const a = 1 - r.r / ring.maxRadius;
          g.lineStyle(2, RING, 0.75 * a).strokeCircle(r.x, r.y, r.r);
          g.lineStyle(1, 0xffffff, 0.4 * a).strokeCircle(r.x, r.y, r.r - 3);
        }
      }
      if (f.brain.finished && f.brain.rings.length === 0) {
        f.destroy();
        this.flyers.splice(i, 1);
      }
    }
  }

  get count(): number {
    return this.flyers.length;
  }
}
