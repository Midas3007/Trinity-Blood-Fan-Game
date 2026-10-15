import Phaser from 'phaser';
import { Pool } from '../systems/Pool';
import type { Rect } from '../combat/types';
import { Enemy } from './Enemy';
import { enemyConfig } from './enemyConfig';
import type { EnemyTarget } from './enemyStates';

export interface EnemySpawn {
  type: string;
  x: number;
  /** y of the floor the enemy stands on. */
  y: number;
}

interface PendingRespawn {
  spawn: EnemySpawn;
  inMs: number;
}

/**
 * Spawns enemies from room data using one pool per enemy type, and respawns
 * them after a delay (test-room behaviour; checkpoints take over in Milestone 5).
 */
export class EnemyManager {
  private readonly pools = new Map<string, Pool<Enemy>>();
  private readonly spawnOf = new Map<Enemy, EnemySpawn>();
  private readonly pending: PendingRespawn[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly target: EnemyTarget,
    private readonly solids: readonly Rect[],
    private readonly solidGroup: Phaser.Physics.Arcade.StaticGroup,
    private readonly respawnMs: number,
  ) {}

  /** Pre-creates `count` enemies of a type so nothing is allocated during play. */
  preload(type: string, count: number): void {
    const cfg = enemyConfig(type);
    const pool = new Pool<Enemy>(count, () => {
      const e = new Enemy(this.scene, cfg, this.target, this.solids);
      this.scene.physics.add.collider(e.sprite, this.solidGroup);
      return e;
    });
    this.pools.set(type, pool);
  }

  spawn(s: EnemySpawn): Enemy | null {
    const pool = this.pools.get(s.type);
    const e = pool?.acquire() ?? null;
    if (!e) return null;
    e.spawn(s.x, s.y);
    this.spawnOf.set(e, s);
    return e;
  }

  /** Living enemies (for combat). */
  get alive(): Enemy[] {
    const out: Enemy[] = [];
    for (const pool of this.pools.values()) for (const e of pool.active()) if (e.alive) out.push(e);
    return out;
  }

  /** Every enemy currently out of the pool, including those mid-collapse. */
  get active(): Enemy[] {
    const out: Enemy[] = [];
    for (const pool of this.pools.values()) out.push(...pool.active());
    return out;
  }

  update(dtMs: number): void {
    for (const pool of this.pools.values()) {
      for (const e of pool.active()) {
        e.update(dtMs);
        if (!e.finished) continue;
        e.despawn();
        pool.release(e);
        const s = this.spawnOf.get(e);
        this.spawnOf.delete(e);
        if (s && this.respawnMs > 0) this.pending.push({ spawn: s, inMs: this.respawnMs });
      }
    }
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i]!;
      p.inMs -= dtMs;
      if (p.inMs <= 0) {
        this.pending.splice(i, 1);
        this.spawn(p.spawn);
      }
    }
  }
}
