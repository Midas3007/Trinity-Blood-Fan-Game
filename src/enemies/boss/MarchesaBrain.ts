import raw from '../../data/bosses/marchesa.json';
import { AttackRunner } from '../../combat/AttackRunner';
import { tableFromRecord } from '../../combat/attackData';
import { Health } from '../../combat/Health';
import type { AttackDef } from '../../combat/types';

export interface ShockwaveCfg {
  speed: number;
  width: number;
  height: number;
  damage: number;
  lifeMs: number;
}

export interface MarchesaConfig {
  name: string;
  maxHealth: number;
  width: number;
  height: number;
  phase2At: number;
  introMs: number;
  idleMs: number;
  idleMsPhase2: number;
  walkSpeed: number;
  walkSpeedPhase2: number;
  walkMaxMs: number;
  slashRange: number;
  lungeDistance: number;
  leapHeight: number;
  leapRiseMs: number;
  leapHangMs: number;
  diveSpeed: number;
  impactMs: number;
  staggerMs: number;
  staggerDamageMultiplier: number;
  stringsMs: number;
  vanishMs: number;
  reappearMs: number;
  chargeSpeed: number;
  tiredMs: number;
  deathMs: number;
  shockwave: ShockwaveCfg;
  patternPhase1: Move[];
  patternPhase2: Move[];
  attacks: Record<string, Omit<AttackDef, 'id'>>;
}

export type Move = 'slash' | 'plummet' | 'charge';

export type MarchesaState =
  | 'intro'
  | 'idle'
  | 'walk'
  | 'slash1'
  | 'slash2'
  | 'leap'
  | 'hang'
  | 'dive'
  | 'impact'
  | 'staggered'
  | 'strings'
  | 'vanish'
  | 'reappear'
  | 'charge'
  | 'tired'
  | 'dead';

export type MarchesaEvent = 'landed' | 'phase2' | 'parried' | 'vanished' | 'reappeared' | 'died';

export interface Shockwave {
  x: number;
  dir: 1 | -1;
  ms: number;
}

export const marchesaConfig = raw as unknown as MarchesaConfig;

/**
 * The Marchesa's fight, without Phaser: where she is, what she is doing, her health, her attack hitboxes
 * (through an AttackRunner, like every other attacker) and the shockwaves on the floor.
 * x is her centre; `lift` is how far her feet are above the arena floor.
 */
export class MarchesaBrain {
  readonly health: Health;
  readonly combat: AttackRunner;
  state: MarchesaState = 'intro';
  stateMs = 0;
  x: number;
  lift = 0;
  facing: 1 | -1 = -1;
  phase: 1 | 2 = 1;
  readonly shockwaves: Shockwave[] = [];
  private patternIndex = 0;
  private move: Move = 'slash';
  private lungeFrom = 0;
  private diveTarget = 0;
  private events: MarchesaEvent[] = [];

  constructor(
    x: number,
    private readonly arenaLeft: number,
    private readonly arenaRight: number,
    readonly cfg: MarchesaConfig = marchesaConfig,
  ) {
    this.x = x;
    this.health = new Health(cfg.maxHealth);
    this.combat = new AttackRunner(tableFromRecord(cfg.attacks));
  }

  get alive(): boolean {
    return !this.health.dead;
  }

  /** Can't be hurt: hanging at the start, while her strings snap, vanished, or already falling. */
  get invulnerable(): boolean {
    return ['intro', 'strings', 'vanish', 'dead'].includes(this.state);
  }

  /** Visible on screen (hidden while vanished). */
  get visible(): boolean {
    return this.state !== 'vanish';
  }

  /** The blade is glowing: an attack is about to land (wind-up), or the phase-2 charge is coming. */
  get telegraphing(): boolean {
    if (this.state === 'reappear') return true;
    return (this.state === 'slash1' || this.state === 'slash2') && this.combat.phase === 'startup';
  }

  /** Events since the last call (landing, phase change, death...) for sound and effects. */
  drainEvents(): MarchesaEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** Applies damage (doubled while reeling from a parry). Returns the damage dealt. */
  takeDamage(amount: number): number {
    if (this.invulnerable || !this.alive) return 0;
    const dmg = this.state === 'staggered' ? Math.round(amount * this.cfg.staggerDamageMultiplier) : amount;
    const dealt = this.health.damage(dmg);
    if (this.health.dead) {
      this.to('dead');
      this.events.push('died');
    } else if (this.phase === 1 && this.health.fraction <= this.cfg.phase2At) {
      this.phase = 2;
      this.to('strings');
      this.events.push('phase2');
    }
    return dealt;
  }

  /** Abel parried her blade: she reels, open to a heavy counter. The dive and shockwaves can't be parried. */
  parried(): void {
    if (!this.alive) return;
    if (!['slash1', 'slash2', 'charge'].includes(this.state)) return;
    this.to('staggered');
    this.events.push('parried');
  }

  update(dtMs: number, playerX: number): void {
    this.stateMs += dtMs;
    this.combat.tick(dtMs);
    this.updateShockwaves(dtMs);
    const c = this.cfg;
    const toward: 1 | -1 = playerX >= this.x ? 1 : -1;
    switch (this.state) {
      case 'intro':
        if (this.stateMs >= c.introMs) this.to('idle');
        break;
      case 'idle':
        this.facing = toward;
        if (this.stateMs >= (this.phase === 1 ? c.idleMs : c.idleMsPhase2)) this.nextMove(playerX);
        break;
      case 'walk': {
        this.facing = toward;
        const speed = this.phase === 1 ? c.walkSpeed : c.walkSpeedPhase2;
        this.moveBy(this.facing * speed * (dtMs / 1000));
        if (Math.abs(playerX - this.x) <= c.slashRange || this.stateMs >= c.walkMaxMs) this.startSlash();
        break;
      }
      case 'slash1': {
        const def = this.combat.current;
        if (def && this.combat.phase !== 'recovery') this.moveBy(this.facing * def.stepSpeed * (dtMs / 1000));
        if (this.combat.phase === 'done' || this.combat.phase === 'recovery') {
          this.combat.begin('slash2');
          this.lungeFrom = this.x;
          this.to('slash2', false);
        }
        break;
      }
      case 'slash2': {
        // The long lunge: she covers lungeDistance during the active frames.
        const def = this.combat.current!;
        if (this.combat.phase === 'active') {
          const t = Math.min(1, (this.stateMs - def.startupMs) / def.activeMs);
          this.setX(this.lungeFrom + this.facing * this.cfg.lungeDistance * t);
        }
        if (this.combat.phase === 'done') this.to('idle');
        break;
      }
      case 'leap': {
        const t = Math.min(1, this.stateMs / c.leapRiseMs);
        this.lift = c.leapHeight * Math.sin((t * Math.PI) / 2);
        if (t >= 1) {
          this.diveTarget = this.clampX(playerX);
          this.to('hang');
        }
        break;
      }
      case 'hang': {
        // Drifts over where Abel was, then drops.
        const t = Math.min(1, this.stateMs / c.leapHangMs);
        this.x += (this.diveTarget - this.x) * Math.min(1, t * 0.5 + 0.2);
        if (t >= 1) {
          this.setX(this.diveTarget);
          this.combat.begin('dive');
          this.to('dive', false);
        }
        break;
      }
      case 'dive':
        this.lift = Math.max(0, this.lift - c.diveSpeed * (dtMs / 1000));
        if (this.lift === 0) {
          this.combat.stop();
          this.shockwaves.push({ x: this.x, dir: -1, ms: 0 }, { x: this.x, dir: 1, ms: 0 });
          this.events.push('landed');
          this.to('impact');
        }
        break;
      case 'impact':
        if (this.stateMs >= c.impactMs) this.to('idle');
        break;
      case 'staggered':
        if (this.stateMs >= c.staggerMs) this.to('idle');
        break;
      case 'strings':
        this.lift = 0;
        if (this.stateMs >= c.stringsMs) this.to('idle');
        break;
      case 'vanish':
        if (this.stateMs >= c.vanishMs) {
          // Reappear at the edge of the arena farthest from Abel, facing him.
          const left = Math.abs(playerX - this.arenaLeft) > Math.abs(playerX - this.arenaRight);
          this.setX(left ? this.arenaLeft + this.cfg.width : this.arenaRight - this.cfg.width);
          this.facing = left ? 1 : -1;
          this.events.push('reappeared');
          this.to('reappear');
        }
        break;
      case 'reappear':
        if (this.stateMs >= c.reappearMs) {
          this.combat.begin('charge');
          this.to('charge', false);
        }
        break;
      case 'charge': {
        this.moveBy(this.facing * c.chargeSpeed * (dtMs / 1000));
        const edge = this.facing > 0 ? this.arenaRight - this.cfg.width : this.arenaLeft + this.cfg.width;
        if ((this.facing > 0 && this.x >= edge) || (this.facing < 0 && this.x <= edge)) {
          this.combat.stop();
          this.to('tired');
        }
        break;
      }
      case 'tired':
        if (this.stateMs >= c.tiredMs) this.to('idle');
        break;
      case 'dead':
        this.lift = Math.max(0, this.lift - c.diveSpeed * (dtMs / 1000));
        break;
    }
  }

  /** The death pose has played out (the scene then frees the arena). */
  get finished(): boolean {
    return this.state === 'dead' && this.stateMs >= this.cfg.deathMs;
  }

  private nextMove(playerX: number): void {
    const pattern = this.phase === 1 ? this.cfg.patternPhase1 : this.cfg.patternPhase2;
    this.move = pattern[this.patternIndex % pattern.length]!;
    this.patternIndex++;
    if (this.move === 'plummet') {
      this.to('leap');
    } else if (this.move === 'charge') {
      this.to('vanish');
      this.events.push('vanished');
    } else if (Math.abs(playerX - this.x) <= this.cfg.slashRange) {
      this.startSlash();
    } else {
      this.to('walk');
    }
  }

  private startSlash(): void {
    this.combat.begin('slash1');
    this.to('slash1', false);
  }

  private updateShockwaves(dtMs: number): void {
    const s = this.cfg.shockwave;
    for (const w of this.shockwaves) {
      w.ms += dtMs;
      w.x += w.dir * s.speed * (dtMs / 1000);
    }
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const w = this.shockwaves[i]!;
      if (w.ms >= s.lifeMs || w.x < this.arenaLeft || w.x > this.arenaRight) this.shockwaves.splice(i, 1);
    }
  }

  private moveBy(dx: number): void {
    this.setX(this.x + dx);
  }

  private setX(x: number): void {
    this.x = this.clampX(x);
  }

  private clampX(x: number): number {
    const half = this.cfg.width / 2;
    return Math.max(this.arenaLeft + half, Math.min(this.arenaRight - half, x));
  }

  /** Change state. `stopAttack` false keeps the attack just begun for the new state. */
  private to(state: MarchesaState, stopAttack = true): void {
    if (stopAttack) this.combat.stop();
    if (state !== 'leap' && state !== 'hang' && state !== 'dive' && state !== 'dead') this.lift = 0;
    this.state = state;
    this.stateMs = 0;
  }
}
