import raw from '../../data/flyers.json';
import { Health } from '../../combat/Health';

export interface RingCfg {
  speed: number;
  maxRadius: number;
  thickness: number;
  damage: number;
}

export interface FlyerConfig {
  type: string;
  label: string;
  width: number;
  height: number;
  maxHealth: number;
  speed: number;
  detectRange: number;
  loseRange: number;
  leash: number;
  hoverAmp: number;
  hoverMs: number;
  preferredDistance: number;
  hoverAbove: number;
  attack: 'swoop' | 'scream';
  attackRange: number;
  windupMs: number;
  attackMs: number;
  recoverMs: number;
  cooldownMs: number;
  swoopSpeed?: number;
  contactDamage: number;
  ring?: RingCfg;
  hurtMs: number;
  deathMs: number;
  knockback: number;
  anim: string;
}

export type FlyerState = 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'hurt' | 'dead';

/** An expanding scream ring. */
export interface Ring {
  x: number;
  y: number;
  r: number;
  hit: boolean;
}

const types = (raw as unknown as { types: Record<string, Omit<FlyerConfig, 'type'>> }).types;
export const flyerConfigs: Record<string, FlyerConfig> = Object.fromEntries(Object.entries(types).map(([k, v]) => [k, { ...v, type: k }]));

export function isFlyer(type: string): boolean {
  return type in flyerConfigs;
}

/**
 * A flying creature without Phaser: bobs near home, closes in on Abel (to its preferred distance), winds up,
 * then swoops (bat) or screams a ring (fairy), recovers. x,y is its centre.
 */
export class FlyerBrain {
  readonly health: Health;
  state: FlyerState = 'idle';
  stateMs = 0;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  readonly rings: Ring[] = [];
  private cooldown = 0;
  private t = Math.random() * 1000;
  private swoopDir = { x: 0, y: 0 };

  constructor(
    readonly cfg: FlyerConfig,
    private readonly homeX: number,
    private readonly homeY: number,
  ) {
    this.x = homeX;
    this.y = homeY;
    this.health = new Health(cfg.maxHealth);
  }

  get alive(): boolean {
    return !this.health.dead;
  }

  get finished(): boolean {
    return this.state === 'dead' && this.stateMs >= this.cfg.deathMs;
  }

  /** Bats hurt on touch only while swooping. */
  get contactActive(): boolean {
    return this.state === 'attack' && this.cfg.attack === 'swoop';
  }

  takeHit(damage: number, knockX: number): void {
    if (!this.alive) return;
    this.health.damage(damage);
    this.vx = Math.sign(knockX) * this.cfg.knockback;
    this.vy = -this.cfg.knockback * 0.3;
    this.to(this.health.dead ? 'dead' : 'hurt');
  }

  update(dtMs: number, px: number, py: number): void {
    const c = this.cfg;
    const s = dtMs / 1000;
    this.stateMs += dtMs;
    this.t += dtMs;
    this.cooldown = Math.max(0, this.cooldown - dtMs);
    this.updateRings(dtMs, s);
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    const homeDist = Math.hypot(this.homeX - this.x, this.homeY - this.y);
    switch (this.state) {
      case 'idle': {
        this.moveToward(this.homeX, this.homeY + Math.sin((this.t / c.hoverMs) * Math.PI * 2) * c.hoverAmp, c.speed * 0.5, s);
        if (dist < c.detectRange) this.to('chase');
        break;
      }
      case 'chase': {
        if (dist > c.loseRange || homeDist > c.leash) {
          this.to('idle');
          break;
        }
        this.facing = dx >= 0 ? 1 : -1;
        // Hold at the preferred distance on Abel's near side, a little above his head.
        const side = dx >= 0 ? -1 : 1;
        const tx = px + side * c.preferredDistance;
        const ty = py - c.hoverAbove + Math.sin((this.t / c.hoverMs) * Math.PI * 2) * c.hoverAmp;
        this.moveToward(tx, ty, c.speed, s);
        if (this.cooldown === 0 && dist <= c.attackRange) this.to('windup');
        break;
      }
      case 'windup':
        this.facing = dx >= 0 ? 1 : -1;
        if (this.stateMs >= c.windupMs) {
          if (c.attack === 'swoop') {
            const d = Math.max(1, dist);
            this.swoopDir = { x: dx / d, y: dy / d };
          } else if (c.ring) {
            this.rings.push({ x: this.x, y: this.y, r: 4, hit: false });
          }
          this.to('attack');
        }
        break;
      case 'attack':
        if (c.attack === 'swoop') {
          this.x += this.swoopDir.x * (c.swoopSpeed ?? 200) * s;
          this.y += this.swoopDir.y * (c.swoopSpeed ?? 200) * s;
        }
        if (this.stateMs >= c.attackMs) {
          this.cooldown = c.cooldownMs;
          this.to('recover');
        }
        break;
      case 'recover':
        this.moveToward(this.x, this.homeY - 10, c.speed * 0.6, s);
        if (this.stateMs >= c.recoverMs) this.to(dist < c.detectRange ? 'chase' : 'idle');
        break;
      case 'hurt':
        this.x += this.vx * s;
        this.y += this.vy * s;
        this.vx *= 0.9;
        this.vy *= 0.9;
        if (this.stateMs >= c.hurtMs) this.to('chase');
        break;
      case 'dead':
        this.vy = Math.min(this.vy + 600 * s, 240); // drops out of the air
        this.y += this.vy * s;
        this.x += this.vx * s;
        break;
    }
  }

  /** A ring edge passing over a point (Abel's centre) this frame: returns the ring (and marks it spent). */
  ringHitAt(px: number, py: number): Ring | null {
    const ring = this.cfg.ring;
    if (!ring) return null;
    for (const r of this.rings) {
      if (r.hit) continue;
      const d = Math.hypot(px - r.x, py - r.y);
      if (Math.abs(d - r.r) <= ring.thickness) {
        r.hit = true;
        return r;
      }
    }
    return null;
  }

  private updateRings(dtMs: number, s: number): void {
    const ring = this.cfg.ring;
    if (!ring || dtMs <= 0) return;
    for (const r of this.rings) r.r += ring.speed * s;
    for (let i = this.rings.length - 1; i >= 0; i--) if (this.rings[i]!.r > ring.maxRadius) this.rings.splice(i, 1);
  }

  private moveToward(tx: number, ty: number, speed: number, s: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.5) return;
    const step = Math.min(d, speed * s);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
  }

  private to(state: FlyerState): void {
    this.state = state;
    this.stateMs = 0;
  }
}
