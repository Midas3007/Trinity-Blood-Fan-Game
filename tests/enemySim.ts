import { AttackRunner } from '../src/combat/AttackRunner';
import type { EnemyConfig } from '../src/enemies/enemyConfig';
import { enemyStates, type EnemyContext, type EnemyStateKey } from '../src/enemies/enemyStates';
import { StateMachine } from '../src/player/StateMachine';

export const DT = 1000 / 60;

/** Enemy on a flat platform from minX to maxX (no walls), with a movable target. */
export class SimEnemy implements EnemyContext {
  readonly combat: AttackRunner;
  readonly fsm: StateMachine<EnemyStateKey, EnemyContext>;
  x: number;
  y = 0;
  vx = 0;
  facing: 1 | -1 = 1;
  attackCooldown = 0;
  patrolDir: 1 | -1 = 1;
  wallAhead = false;
  target = { x: 1000, y: 0, alive: true };

  constructor(
    readonly cfg: EnemyConfig,
    readonly homeX = 0,
    private readonly minX = -1000,
    private readonly maxX = 1000,
  ) {
    this.x = homeX;
    this.combat = new AttackRunner(cfg.attacks);
    this.fsm = new StateMachine(enemyStates, 'idle', this as EnemyContext);
  }

  get groundAhead(): boolean {
    const probe = this.x + this.facing * (this.cfg.width / 2 + 2);
    return probe >= this.minX && probe <= this.maxX;
  }

  get state(): EnemyStateKey {
    return this.fsm.current;
  }

  step(): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - DT);
    this.fsm.update(DT);
    this.x = Math.min(this.maxX, Math.max(this.minX, this.x + (this.vx * DT) / 1000));
  }

  run(frames: number): void {
    for (let i = 0; i < frames; i++) this.step();
  }

  /** Runs until the state is `key` or the frame budget runs out; returns frames used or -1. */
  runUntil(key: EnemyStateKey, maxFrames = 600): number {
    for (let i = 0; i < maxFrames; i++) {
      if (this.state === key) return i;
      this.step();
    }
    return this.state === key ? maxFrames : -1;
  }
}
