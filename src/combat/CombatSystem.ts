import type { EventBus } from '../systems/EventBus';
import type { GameEvents } from '../systems/gameEvents';
import type { AttackRunner } from './AttackRunner';
import { overlaps } from './geometry';
import type { Health } from './Health';
import { resolveAttack } from './resolve';
import type { Damageable, HitInfo, Rect } from './types';

/** Anything that swings an AttackRunner-driven attack. */
export interface Attacker {
  readonly combat: AttackRunner;
  readonly x: number;
  readonly y: number;
  readonly facing: 1 | -1;
}

/** Something that hurts on touch (e.g. the red training dummy, later spikes). */
export interface ContactHazard {
  readonly alive: boolean;
  readonly contactDamage: number;
  hurtbox(): Rect;
  contactHit(targetX: number): HitInfo;
}

export interface PlayerCombatant extends Attacker, Damageable {
  readonly health: Health;
  readonly invulnerable: boolean;
}

/**
 * Resolves all hits for one frame and announces them on the event bus.
 * Pure (no Phaser): feedback, HUD and respawn react to the events elsewhere.
 */
export class CombatSystem {
  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly player: PlayerCombatant,
  ) {}

  step(playerTargets: readonly Damageable[], enemyAttackers: readonly Attacker[], hazards: readonly ContactHazard[]): void {
    const p = this.player;

    for (const r of resolveAttack(p.combat, p.x, p.y, p.facing, playerTargets)) {
      this.bus.emit('combat:hit', { x: r.x, y: r.y, hit: r.hit, targetId: r.target.id, byPlayer: true });
      if (!r.target.alive) this.bus.emit('enemy:died', { id: r.target.id, x: r.target.x, y: r.y });
    }

    for (const e of enemyAttackers) {
      if (!p.alive) break;
      for (const r of resolveAttack(e.combat, e.x, e.y, e.facing, [p])) this.playerWasHit(r.hit, r.x, r.y);
    }

    for (const h of hazards) {
      if (!p.alive || p.invulnerable) break;
      if (!h.alive || h.contactDamage <= 0 || !overlaps(p.hurtbox(), h.hurtbox())) continue;
      const hit = h.contactHit(p.x);
      if (p.receiveHit(hit)) this.playerWasHit(hit, p.x, p.y);
    }
  }

  private playerWasHit(hit: HitInfo, x: number, y: number): void {
    const p = this.player;
    this.bus.emit('combat:hit', { x, y, hit, targetId: p.id, byPlayer: false });
    this.bus.emit('player:hurt', { hp: p.health.hp, max: p.health.max });
    if (p.health.dead) this.bus.emit('player:died', {});
  }
}
