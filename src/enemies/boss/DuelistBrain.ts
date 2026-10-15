import { AttackRunner } from '../../combat/AttackRunner';
import { tableFromRecord } from '../../combat/attackData';
import { Health } from '../../combat/Health';
import type { AttackDef } from '../../combat/types';

/**
 * A data-driven duel boss (the mini bosses): a fixed rotation of moves per phase, like the Marchesa, but every move
 * is a small recipe from data so a new fighter needs only JSON and sprites.
 *
 *   combo     walk into range, then a chain of attacks; an attack can carry a lunge (distance during its active frames)
 *   dash      rush across a fixed distance with an attack active (from where she stands, or from the arena edge)
 *   leap      jump up, drift over Abel, dive with an attack active; optional floor shockwaves on landing
 *   teleport  vanish, reappear right behind Abel, then strike with one attack
 *   cast      wind up, then fire projectiles at Abel (they fly straight; jump or dodge them)
 *   summon    call creatures (the scene spawns them)
 *   slam      one heavy attack, then floor shockwaves both ways
 */
export type DuelMove =
  | { type: 'combo'; attacks: string[]; lunges?: number[] }
  | { type: 'dash'; attack: string; distance: number; speed: number; fromEdge?: boolean; telegraphMs?: number }
  | { type: 'leap'; attack: string; height: number; riseMs: number; hangMs: number; diveSpeed: number; shockwaves?: boolean }
  | { type: 'teleport'; attack: string; vanishMs: number }
  | { type: 'cast'; windupMs: number; recoverMs: number; projectile: ProjectileCfg; count: number; spreadDeg: number; aimed?: boolean }
  | { type: 'summon'; creature: string; count: number; windupMs: number }
  | { type: 'slam'; attack: string; shockwaves: boolean };

export interface ProjectileCfg {
  speed: number;
  damage: number;
  size: number;
  lifeMs: number;
  color: string;
}

export interface DuelPhase {
  /** Starts when health falls to this fraction (the first phase uses 1). */
  at: number;
  pattern: string[];
  idleMs: number;
  walkSpeed: number;
}

export interface DuelistConfig {
  id: string;
  name: string;
  maxHealth: number;
  width: number;
  height: number;
  introMs: number;
  /** Untouchable pause between phases (the scene may play a cutscene here). */
  phaseMs: number;
  approachRange: number;
  walkMaxMs: number;
  staggerMs: number;
  staggerDamageMultiplier: number;
  recoverMs: number;
  /** Non-lethal fights: at zero health she yields instead of dying. */
  yields: boolean;
  deathMs: number;
  shockwave: { speed: number; width: number; height: number; damage: number; lifeMs: number };
  phases: DuelPhase[];
  moves: Record<string, DuelMove>;
  attacks: Record<string, Omit<AttackDef, 'id'>>;
  /** Which pose each state (or `attack:<id>`) shows: animation names under boss_<id>_. */
  visuals: Record<string, string>;
  /** Cutscene the scene plays at the first phase change (e.g. Abel's first Crusnik transformation). */
  phaseScene?: string;
  /** Relic granted on victory (src/data/relics.json). */
  relic: string;
}

export type DuelState =
  | 'intro'
  | 'idle'
  | 'walk'
  | 'attack'
  | 'dash'
  | 'telegraph'
  | 'leap'
  | 'hang'
  | 'dive'
  | 'vanish'
  | 'cast'
  | 'summon'
  | 'recover'
  | 'staggered'
  | 'phase'
  | 'defeated';

export type DuelEvent =
  | { type: 'phase'; phase: number }
  | { type: 'summon'; creature: string; count: number }
  | { type: 'landed' }
  | { type: 'parried' }
  | { type: 'defeated' };

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ms: number;
  cfg: ProjectileCfg;
  hit: boolean;
}

export interface Wave {
  x: number;
  dir: 1 | -1;
  ms: number;
}

/** Duel boss logic without Phaser. `x` is her centre; `lift` how high her feet are above the floor. */
export class DuelistBrain {
  readonly health: Health;
  readonly combat: AttackRunner;
  state: DuelState = 'intro';
  stateMs = 0;
  x: number;
  lift = 0;
  facing: 1 | -1 = -1;
  phaseIndex = 0;
  readonly projectiles: Projectile[] = [];
  readonly waves: Wave[] = [];
  /** The id of the move being performed (for visuals). */
  moveId = '';
  /** The attack in progress, or the last one (for visuals). */
  attackId = '';
  private patternIndex = 0;
  private comboStep = 0;
  private dashFrom = 0;
  private lungeFrom = 0;
  private target = 0;
  private events: DuelEvent[] = [];
  /** Whether the next phase change pauses (the scene clears this flag when its cutscene ends). */
  holdForScene = false;

  constructor(
    readonly cfg: DuelistConfig,
    x: number,
    private readonly arenaLeft: number,
    private readonly arenaRight: number,
    /** Height of Abel's centre above the floor, to aim projectiles. */
    private readonly aimHeight = 15,
  ) {
    this.x = x;
    this.health = new Health(cfg.maxHealth);
    this.combat = new AttackRunner(tableFromRecord(cfg.attacks));
    for (const p of cfg.phases) for (const m of p.pattern) if (!(m in cfg.moves)) throw new Error(`${cfg.id}: unknown move "${m}"`);
  }

  get alive(): boolean {
    return this.state !== 'defeated';
  }

  get phase(): DuelPhase {
    return this.cfg.phases[this.phaseIndex]!;
  }

  get invulnerable(): boolean {
    return this.state === 'intro' || this.state === 'phase' || this.state === 'vanish' || this.state === 'defeated';
  }

  get visible(): boolean {
    return this.state !== 'vanish';
  }

  /** Something is about to hit: wind-ups glow amber (the dash from the edge glows red). */
  get telegraphing(): boolean {
    if (this.state === 'telegraph' || this.state === 'cast' || this.state === 'summon') return true;
    return this.state === 'attack' && this.combat.phase === 'startup';
  }

  get finished(): boolean {
    return this.state === 'defeated' && this.stateMs >= this.cfg.deathMs;
  }

  drainEvents(): DuelEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  takeDamage(amount: number): number {
    if (this.invulnerable) return 0;
    const dmg = this.state === 'staggered' ? Math.round(amount * this.cfg.staggerDamageMultiplier) : amount;
    const dealt = this.health.damage(dmg);
    if (this.health.dead) {
      this.to('defeated');
      this.events.push({ type: 'defeated' });
      return dealt;
    }
    const next = this.cfg.phases[this.phaseIndex + 1];
    if (next && this.health.fraction <= next.at) {
      this.phaseIndex++;
      this.patternIndex = 0;
      this.to('phase');
      this.events.push({ type: 'phase', phase: this.phaseIndex + 1 });
    }
    return dealt;
  }

  /** A parried blade: she reels. Spells, slams and dives can't be parried. */
  parried(): void {
    if (!['attack', 'dash'].includes(this.state)) return;
    this.to('staggered');
    this.events.push({ type: 'parried' });
  }

  update(dtMs: number, playerX: number): void {
    this.stateMs += dtMs;
    this.combat.tick(dtMs);
    this.updateProjectiles(dtMs);
    this.updateWaves(dtMs);
    const c = this.cfg;
    const s = dtMs / 1000;
    const toward: 1 | -1 = playerX >= this.x ? 1 : -1;
    const move = c.moves[this.moveId];
    switch (this.state) {
      case 'intro':
        if (this.stateMs >= c.introMs) this.to('idle');
        break;
      case 'phase':
        if (!this.holdForScene && this.stateMs >= c.phaseMs) this.to('idle');
        break;
      case 'idle':
        this.facing = toward;
        if (this.stateMs >= this.phase.idleMs) this.nextMove(playerX);
        break;
      case 'walk':
        this.facing = toward;
        this.setX(this.x + this.facing * this.phase.walkSpeed * s);
        if (Math.abs(playerX - this.x) <= c.approachRange || this.stateMs >= c.walkMaxMs) this.startAttack();
        break;
      case 'attack': {
        const def = this.combat.current;
        const lunge = move?.type === 'combo' ? (move.lunges?.[this.comboStep] ?? 0) : 0;
        if (def && this.combat.phase === 'active') {
          if (lunge > 0) {
            const t = Math.min(1, (this.stateMs - def.startupMs) / def.activeMs);
            this.setX(this.lungeFrom + this.facing * lunge * t);
          } else if (def.stepSpeed > 0) this.setX(this.x + this.facing * def.stepSpeed * s);
        }
        if (this.combat.phase === 'done' || (this.combat.phase === 'recovery' && this.hasNextComboStep())) {
          if (this.hasNextComboStep()) {
            this.comboStep++;
            this.facing = toward;
            this.beginAttack((move as { attacks: string[] }).attacks[this.comboStep]!);
          } else if (move?.type === 'slam' && move.shockwaves) {
            this.spawnWaves();
            this.to('recover');
          } else {
            this.to('recover');
          }
        }
        break;
      }
      case 'telegraph':
        if (move?.type === 'dash' && this.stateMs >= (move.telegraphMs ?? 400)) {
          this.dashFrom = this.x;
          this.beginAttack(move.attack, 'dash');
        }
        break;
      case 'dash': {
        if (move?.type !== 'dash') break;
        this.setX(this.x + this.facing * move.speed * s);
        const edge = this.facing > 0 ? this.arenaRight - c.width : this.arenaLeft + c.width;
        const done = Math.abs(this.x - this.dashFrom) >= move.distance || (this.facing > 0 ? this.x >= edge : this.x <= edge);
        if (done) this.to('recover');
        break;
      }
      case 'leap': {
        if (move?.type !== 'leap') break;
        const t = Math.min(1, this.stateMs / move.riseMs);
        this.lift = move.height * Math.sin((t * Math.PI) / 2);
        if (t >= 1) {
          this.target = this.clampX(playerX);
          this.to('hang');
        }
        break;
      }
      case 'hang': {
        if (move?.type !== 'leap') break;
        this.x += (this.target - this.x) * Math.min(1, dtMs / 120);
        if (this.stateMs >= move.hangMs) {
          this.setX(this.target);
          this.beginAttack(move.attack, 'dive');
        }
        break;
      }
      case 'dive': {
        if (move?.type !== 'leap') break;
        this.lift = Math.max(0, this.lift - move.diveSpeed * s);
        if (this.lift === 0) {
          this.combat.stop();
          if (move.shockwaves) this.spawnWaves();
          this.events.push({ type: 'landed' });
          this.to('recover');
        }
        break;
      }
      case 'vanish':
        if (move?.type === 'teleport' && this.stateMs >= move.vanishMs) {
          // Reappear just behind Abel, facing him.
          const behind = this.clampX(playerX + (playerX >= this.x ? 28 : -28));
          this.setX(behind);
          this.facing = playerX >= this.x ? 1 : -1;
          this.beginAttack(move.attack);
        }
        break;
      case 'cast':
        if (move?.type === 'cast') {
          this.facing = toward;
          if (this.stateMs >= move.windupMs && !this.casted) {
            this.casted = true;
            this.fire(move, playerX);
          }
          if (this.stateMs >= move.windupMs + move.recoverMs) this.to('idle');
        }
        break;
      case 'summon':
        if (move?.type === 'summon' && this.stateMs >= move.windupMs) {
          this.events.push({ type: 'summon', creature: move.creature, count: move.count });
          this.to('recover');
        }
        break;
      case 'recover':
        if (this.stateMs >= c.recoverMs) this.to('idle');
        break;
      case 'staggered':
        if (this.stateMs >= c.staggerMs) this.to('idle');
        break;
      case 'defeated':
        this.lift = Math.max(0, this.lift - 500 * s);
        break;
    }
  }

  /** A projectile overlapping a box this frame (marks it spent). */
  projectileHit(box: { x: number; y: number; w: number; h: number }, floorY: number): Projectile | null {
    for (const p of this.projectiles) {
      if (p.hit) continue;
      const py = floorY - p.y;
      const r = p.cfg.size / 2;
      if (p.x + r > box.x && p.x - r < box.x + box.w && py + r > box.y && py - r < box.y + box.h) {
        p.hit = true;
        return p;
      }
    }
    return null;
  }

  private casted = false;

  private nextMove(playerX: number): void {
    const pattern = this.phase.pattern;
    this.moveId = pattern[this.patternIndex % pattern.length]!;
    this.patternIndex++;
    const m = this.cfg.moves[this.moveId]!;
    this.comboStep = 0;
    switch (m.type) {
      case 'combo':
        if (Math.abs(playerX - this.x) <= this.cfg.approachRange) this.startAttack();
        else this.to('walk');
        break;
      case 'slam':
        this.beginAttack(m.attack);
        break;
      case 'dash':
        if (m.fromEdge) {
          const left = Math.abs(playerX - this.arenaLeft) > Math.abs(playerX - this.arenaRight);
          this.setX(left ? this.arenaLeft + this.cfg.width : this.arenaRight - this.cfg.width);
        }
        this.facing = playerX >= this.x ? 1 : -1;
        this.to('telegraph');
        break;
      case 'leap':
        this.to('leap');
        break;
      case 'teleport':
        this.to('vanish');
        break;
      case 'cast':
        this.casted = false;
        this.to('cast');
        break;
      case 'summon':
        this.to('summon');
        break;
    }
  }

  private hasNextComboStep(): boolean {
    const m = this.cfg.moves[this.moveId];
    return m?.type === 'combo' && this.comboStep + 1 < m.attacks.length;
  }

  private startAttack(): void {
    const m = this.cfg.moves[this.moveId];
    if (m?.type === 'combo') this.beginAttack(m.attacks[0]!);
    else this.to('recover');
  }

  private beginAttack(id: string, state: DuelState = 'attack'): void {
    this.combat.begin(id);
    this.attackId = id;
    this.lungeFrom = this.x;
    this.state = state;
    this.stateMs = 0;
  }

  private fire(m: Extract<DuelMove, { type: 'cast' }>, playerX: number): void {
    const n = m.count;
    for (let i = 0; i < n; i++) {
      const spread = n > 1 ? (i / (n - 1) - 0.5) * m.spreadDeg : 0;
      const dx = playerX - this.x;
      const base = m.aimed ? Math.atan2(this.aimHeight - (this.lift + this.cfg.height * 0.6), Math.abs(dx) || 1) : 0;
      const ang = base + (spread * Math.PI) / 180;
      const dir = dx >= 0 ? 1 : -1;
      this.projectiles.push({
        x: this.x + dir * (this.cfg.width / 2 + 4),
        y: this.lift + this.cfg.height * 0.6,
        vx: Math.cos(ang) * m.projectile.speed * dir,
        vy: Math.sin(ang) * m.projectile.speed,
        ms: 0,
        cfg: m.projectile,
        hit: false,
      });
    }
  }

  private spawnWaves(): void {
    this.waves.push({ x: this.x, dir: -1, ms: 0 }, { x: this.x, dir: 1, ms: 0 });
  }

  private updateProjectiles(dtMs: number): void {
    const s = dtMs / 1000;
    for (const p of this.projectiles) {
      p.ms += dtMs;
      p.x += p.vx * s;
      p.y += p.vy * s; // y is height above the floor
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      if (p.hit || p.ms >= p.cfg.lifeMs || p.x < this.arenaLeft || p.x > this.arenaRight || p.y < -4) this.projectiles.splice(i, 1);
    }
  }

  private updateWaves(dtMs: number): void {
    const w = this.cfg.shockwave;
    for (const v of this.waves) {
      v.ms += dtMs;
      v.x += v.dir * w.speed * (dtMs / 1000);
    }
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const v = this.waves[i]!;
      if (v.ms >= w.lifeMs || v.x < this.arenaLeft || v.x > this.arenaRight) this.waves.splice(i, 1);
    }
  }

  private setX(x: number): void {
    this.x = this.clampX(x);
  }

  private clampX(x: number): number {
    const half = this.cfg.width / 2;
    return Math.max(this.arenaLeft + half, Math.min(this.arenaRight - half, x));
  }

  private to(state: DuelState): void {
    this.combat.stop();
    if (state !== 'leap' && state !== 'hang' && state !== 'dive' && state !== 'defeated') this.lift = 0;
    this.state = state;
    this.stateMs = 0;
  }
}
