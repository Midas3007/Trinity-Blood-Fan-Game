import type { ContactHazard } from './CombatSystem';
import type { Rect } from './types';

/** A burst of fire left by a dying creature (the grown flame-beast): it flares, then bursts once. */
export interface BurstConfig {
  /** How long it flares before it bursts (ms): time to step away. */
  delayMs: number;
  /** How long the burst burns (ms). */
  activeMs: number;
  radius: number;
  damage: number;
}

interface Burst {
  x: number;
  y: number;
  ms: number;
  cfg: BurstConfig;
  /** It hits the player at most once. */
  spent: boolean;
}

/** Pure (no Phaser): the bursts in play, their danger zones and what to draw. */
export class FireBursts {
  private list: Burst[] = [];

  add(x: number, y: number, cfg: BurstConfig): void {
    this.list.push({ x, y, ms: 0, cfg, spent: false });
  }

  update(dtMs: number): void {
    for (const b of this.list) b.ms += dtMs;
    this.list = this.list.filter((b) => b.ms < b.cfg.delayMs + b.cfg.activeMs);
  }

  /** The bursts burning now that have not hit yet, as hazards the combat system resolves. */
  hazards(): ContactHazard[] {
    return this.list
      .filter((b) => !b.spent && b.ms >= b.cfg.delayMs)
      .map((b) => {
        const r = b.cfg.radius;
        const box: Rect = { x: b.x - r, y: b.y - r, w: r * 2, h: r * 2 };
        return {
          alive: true,
          contactDamage: b.cfg.damage,
          hurtbox: () => box,
          contactHit: (tx: number) => {
            b.spent = true;
            return { damage: b.cfg.damage, knockbackX: (tx >= b.x ? 1 : -1) * 170, knockbackY: 140, hitstopMs: 70, shakeMs: 140, shakeIntensity: 0.008, parryable: false };
          },
        };
      });
  }

  /** For drawing: each burst's centre, size and phase (flaring 0..1, then burning 0..1). */
  get shapes(): { x: number; y: number; radius: number; flaring: boolean; t: number }[] {
    return this.list.map((b) => {
      const flaring = b.ms < b.cfg.delayMs;
      return { x: b.x, y: b.y, radius: b.cfg.radius, flaring, t: flaring ? b.ms / b.cfg.delayMs : (b.ms - b.cfg.delayMs) / b.cfg.activeMs };
    });
  }

  clear(): void {
    this.list = [];
  }
}
