import { StateMachine } from '../src/player/StateMachine';
import { PlayerTimers } from '../src/player/PlayerTimers';
import { gravityFor } from '../src/player/movement';
import { playerStates, type PlayerContext, type PlayerStateKey } from '../src/player/playerStates';
import { playerTuning, type PlayerTuning } from '../src/player/tuning';
import { AttackRunner } from '../src/combat/AttackRunner';
import { attackTable } from '../src/combat/attackData';
import { FinisherRunner } from '../src/combat/FinisherRunner';
import { chooseFinisher, type FinisherTarget } from '../src/combat/finisherData';

export const DT = 1000 / 60;

export interface SimInput {
  moveX?: number;
  jump?: boolean;
  dodge?: boolean;
  /** True on the frame the attack button is pressed. */
  attack?: boolean;
  /** Stick held down (crouch). */
  down?: boolean;
  /** Stick vertical, -1 up .. 1 down (overrides `down` when set). */
  moveY?: number;
}

/**
 * Minimal stand-in for Player + Arcade physics: a point on flat ground at y = 0
 * (negative y is up), optionally with a ledge edge at x = ledgeX beyond which there is no floor.
 * Mirrors the update order in Player.update.
 */
export class SimPlayer implements PlayerContext {
  readonly tuning: PlayerTuning;
  readonly timers: PlayerTimers;
  readonly combat = new AttackRunner(attackTable);
  attackPressed = false;
  crouchHeld = false;
  canStand = true;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  jumpCut = false;
  fallDistance = 0;
  moveX = 0;
  jumpHeld = false;
  dodgePressed = false;
  ledgeX = Infinity;
  onOneway = false;
  healWanted = false;
  flasksDrunk = 0;
  drinkFlask(): void {
    this.flasksDrunk++;
  }
  moveY = 0;
  ladderHere = false;
  ladderBelow = false;
  climbing = false;
  atLadderTop = false;
  setClimbing(on: boolean): void {
    this.climbing = on;
  }
  finishClimbAtTop(): void {
    this.climbing = false;
    this.vy = 0;
  }
  drops = 0;
  dropThrough(): void {
    this.drops++;
  }
  /** Enemies a finisher could be used on (fakes). */
  finisherTargets: FinisherTarget[] = [];
  readonly finishing = new FinisherRunner();
  strikes = 0;
  private findFinisher() {
    for (const t of this.finisherTargets) {
      const def = chooseFinisher('priest', this.x, this.y, this.facing, t);
      if (def) return { def, target: t };
    }
    return null;
  }
  get finisherReady(): boolean {
    return this.findFinisher() !== null;
  }
  beginFinisher(): void {
    const f = this.findFinisher();
    if (!f) return;
    if (f.target.x !== this.x) this.facing = f.target.x > this.x ? 1 : -1;
    this.finishing.begin(f.def, f.target);
  }
  tickFinisher(dtMs: number): boolean {
    if (this.finishing.tick(dtMs, this.facing)) this.strikes++;
    return this.finishing.done;
  }
  endFinisher(): void {
    this.finishing.stop();
  }
  /** Floor height under x: 0 before the ledge, far below after it. */
  private floorAt(x: number): number {
    return x <= this.ledgeX ? 0 : 10_000;
  }
  private airTopY = 0;
  private jumpPressedThisFrame = false;
  private prevJump = false;
  readonly fsm: StateMachine<PlayerStateKey, PlayerContext>;
  maxHeight = 0;

  constructor(tuning: PlayerTuning = playerTuning) {
    this.tuning = tuning;
    this.timers = new PlayerTimers(tuning);
    this.fsm = new StateMachine(playerStates, 'idle', this as PlayerContext);
  }

  get onGround(): boolean {
    return this.y >= this.floorAt(this.x) && this.vy >= 0;
  }

  get state(): PlayerStateKey {
    return this.fsm.current;
  }

  /** One frame: input, game logic, then physics (like Phaser's next step). */
  step(input: SimInput = {}): void {
    this.moveX = input.moveX ?? 0;
    const jump = input.jump ?? false;
    this.jumpPressedThisFrame = jump && !this.prevJump;
    this.prevJump = jump;
    this.jumpHeld = jump;
    this.dodgePressed = input.dodge ?? false;
    this.attackPressed = input.attack ?? false;
    this.crouchHeld = input.down ?? false;
    this.moveY = input.moveY ?? (this.crouchHeld ? 1 : 0);

    if (!this.onGround) this.airTopY = Math.min(this.airTopY, this.y);
    this.fallDistance = this.y - this.airTopY;
    this.timers.tick({ dtMs: DT, jumpPressed: this.jumpPressedThisFrame, onGround: this.onGround, velocityY: this.vy });
    this.fsm.update(DT);
    if (this.onGround) this.airTopY = this.y;

    // Physics step.
    const g = this.climbing ? 0 : gravityFor(this.vy, this.tuning);
    this.vy = Math.min(this.vy + (g * DT) / 1000, this.tuning.maxFallSpeed);
    this.x += (this.vx * DT) / 1000;
    this.y += (this.vy * DT) / 1000;
    const floor = this.floorAt(this.x);
    if (this.y >= floor) {
      this.y = floor;
      this.vy = 0;
    }
    this.maxHeight = Math.max(this.maxHeight, -this.y);
  }

  run(frames: number, input: SimInput = {}): void {
    for (let i = 0; i < frames; i++) this.step(input);
  }

  /** Drop from a height (for hard-landing tests). */
  placeInAir(height: number): void {
    this.y = -height;
    this.airTopY = this.y;
    this.vy = 0;
  }
}

export function framesFor(ms: number): number {
  return Math.ceil(ms / DT);
}
