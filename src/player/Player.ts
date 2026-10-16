import Phaser from 'phaser';
import { damageTaken } from '../systems/settings';
import { DEFAULT_WEAPON } from '../combat/attackData';
import { COLORS } from '../core/constants';
import type { ActionState } from '../systems/input/ActionState';
import { AttackRunner } from '../combat/AttackRunner';
import { attackTable } from '../combat/attackData';
import { centredRect, overlaps } from '../combat/geometry';
import { Health } from '../combat/Health';
import { nextEntityId } from '../combat/ids';
import type { HitInfo, Rect } from '../combat/types';
import type { PlayerCombatant } from '../combat/CombatSystem';
import { StateMachine } from './StateMachine';
import { PlayerTimers } from './PlayerTimers';
import { gravityFor } from './movement';
import { playerStates, postureFor, type PlayerContext, type PlayerStateKey, type Posture } from './playerStates';
import { playerTuning, type PlayerTuning } from './tuning';
import { PlayerView, type VisualKey } from './PlayerView';
import { findLedge, hangCentre, standCentre, type Ledge } from './ledge';
import { FinisherRunner } from '../combat/FinisherRunner';
import { StrengthBuff } from '../combat/StrengthBuff';
import { chooseFinisher, type AbelForm, type FinisherDef, type FinisherTarget } from '../combat/finisherData';
import { CrusnikMeter, crusnikConfig, crusnikTuning } from './CrusnikMeter';

const CRUSNIK_TUNING = crusnikTuning(playerTuning);
/** 80%: wings. Only in the final battle (scripted): a far higher leap, the blood never runs out, harder blows. */
const WINGED_TUNING: PlayerTuning = { ...CRUSNIK_TUNING, jumpVelocity: 540, fallingGravity: playerTuning.fallingGravity * 0.6 };
const WINGED_DAMAGE = 1.3;

const INVULNERABLE_ALPHA = 0.45;
/** How long a deliberate drop ignores one-way platforms (ms), and the small downward push that starts it. */
const DROP_THROUGH_MS = 220;
const DROP_NUDGE = 60;
/** The floor at a ladder's top is one tile above the ladder's first tile; climbing down starts this far under it (px). */
const LADDER_TOP_OFFSET = 16;
const LADDER_STEP_DOWN = 6;
/** After a pull-up, stand this far in from the ledge edge (px). */
const LEDGE_STEP_IN = 2;
/** Below this fraction of run speed the walk animation plays instead of the run. */
const WALK_LOOK_FRACTION = 0.6;
/** Blink period while invulnerable after being hurt (ms). */
const BLINK_MS = 80;

/** Placeholder player: a rectangle with an Arcade body driven by the player state machine. */
export class Player implements PlayerContext, PlayerCombatant {
  readonly id = nextEntityId();
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly timers = new PlayerTimers(playerTuning);
  readonly combat = new AttackRunner(attackTable);
  readonly health = new Health(playerTuning.maxHealth);
  facing: 1 | -1 = 1;
  jumpCut = false;
  fallDistance = 0;
  private airTopY: number;
  private height: number;
  canStand = true;
  private blinkMs = 0;
  private alpha = 1;
  private readonly fsm: StateMachine<PlayerStateKey, PlayerContext>;
  private readonly facingMark: Phaser.GameObjects.Rectangle;
  readonly view: PlayerView;
  /** Which Abel this is (the Crusnik form comes from ABIL when the blood meter is full). */
  form: AbelForm = 'priest';
  /** The priest's weapon in hand (src/data/weapons.json). */
  weapon = DEFAULT_WEAPON;
  readonly crusnik = new CrusnikMeter();
  /** Called when the form changes (flash and HUD live in the scene). */
  onFormChange: ((form: AbelForm) => void) | null = null;
  readonly finishing = new FinisherRunner();
  readonly strength = new StrengthBuff();
  /** Enemies a finisher could be used on; set by the scene. */
  finisherTargets: () => readonly FinisherTarget[] = () => [];
  /** Called when a finisher's strike lands (feedback lives in the scene). */
  onFinisher: ((def: FinisherDef, target: FinisherTarget, direction: 1 | -1) => void) | null = null;
  private finishTarget: FinisherTarget | null = null;
  /** ms left of falling through one-way platforms on purpose. */
  dropMs = 0;
  /** Set by the scene each frame: standing on a one-way platform. */
  onOneway = false;
  /** Set by the scene each frame: the ladder in reach (tile rect; its top floor is one tile above it), or null. */
  ladder: Rect | null = null;
  /** Solid rectangles for stepping up stairs (set by the scene). */
  stepSolids: readonly Rect[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly input: ActionState,
    private readonly worldGravity: number,
    private readonly solids: readonly Rect[],
  ) {
    const t = this.tuning;
    this.height = t.height;
    this.sprite = scene.add.rectangle(x, y, t.width, t.height, COLORS.player);
    // Small mark showing which way the player faces (placeholder art).
    this.facingMark = scene.add.rectangle(x, y, 4, 4, COLORS.accent);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    // No world-bounds collision: walking off a room's open edge enters the neighbouring room.
    this.body.setMaxVelocityY(t.maxFallSpeed);
    this.airTopY = y;
    this.fsm = new StateMachine(playerStates, 'idle', this as PlayerContext);
    this.view = new PlayerView(scene, this.sprite, this.facingMark);
    // Draw after Arcade has copied this step's body position onto the game object (POST_UPDATE), so the
    // sprite never trails the body by a frame at roll/slide speeds.
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncView, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncView, this));
  }

  get tuning(): PlayerTuning {
    if (this.winged) return WINGED_TUNING;
    return this.form === 'crusnik' ? CRUSNIK_TUNING : playerTuning;
  }

  get parryPressed(): boolean {
    return this.input.justPressed('parry');
  }

  private parryWindow = false;
  private parryHit = false;
  private parryPending = false;
  /** Called when a parry deflects a hit (feedback lives in the scene). */
  onParry: (() => void) | null = null;

  get parryOpen(): boolean {
    return this.parryWindow;
  }

  set parryOpen(open: boolean) {
    // Closed -> open only happens when a new parry starts (the window never reopens within one).
    if (open && !this.parryWindow) this.parryHit = false;
    this.parryWindow = open;
  }

  get parrySucceeded(): boolean {
    return this.parryHit;
  }

  /** True once after a hit was deflected (the combat system then staggers the attacker). */
  consumeParry(): boolean {
    const p = this.parryPending;
    this.parryPending = false;
    return p;
  }

  get abilityPressed(): boolean {
    return this.input.justPressed('ability');
  }

  get transformReady(): boolean {
    return this.crusnik.ready;
  }

  beginTransform(): void {
    this.crusnik.activate();
  }

  completeTransform(): void {
    this.setForm('crusnik');
  }

  private setForm(form: AbelForm): void {
    if (this.form === form) return;
    this.form = form;
    this.onFormChange?.(form);
  }

  /** 80% (wings): set by the final battle's scene. */
  winged = false;

  /** Scripted: become the Crusnik at once (the meter must be unlocked; it starts draining). */
  forceTransform(): void {
    if (this.form === 'crusnik') return;
    this.crusnik.fill();
    this.crusnik.activate();
    this.setForm('crusnik');
  }

  /** Entering a room mid-transformation: stay the Crusnik (the meter was restored active). */
  resumeCrusnik(): void {
    if (this.crusnik.active) this.setForm('crusnik');
  }

  /** Back to the priest at once (death, respawn). */
  endCrusnik(): void {
    this.crusnik.end();
    this.setForm('priest');
  }

  /** Extra damage from relics (set from the earned relics when the room starts). */
  relicDamage = 1;
  /** Flasks when full (base + relics). */
  maxFlasks = playerTuning.flasks;

  applyStats(s: { maxHealth: number; flasks: number; damage: number }): void {
    this.health.setMax(s.maxHealth);
    this.relicDamage = s.damage;
    this.maxFlasks = s.flasks;
  }

  get state(): PlayerStateKey {
    return this.fsm.current;
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  get onGround(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  get moveX(): number {
    return this.input.moveX;
  }

  get jumpHeld(): boolean {
    return this.input.isDown('jump');
  }

  get dodgePressed(): boolean {
    return this.input.justPressed('dodge');
  }

  get attackPressed(): boolean {
    return this.input.justPressed('attack');
  }

  get crouchHeld(): boolean {
    return this.input.moveY >= this.tuning.crouchStickThreshold;
  }

  /** Current body height (changes with posture). */
  get bodyHeight(): number {
    return this.height;
  }

  /** y of the player's feet. */
  get feetY(): number {
    return this.sprite.y + this.height / 2;
  }

  /** Would a standing body fit here without overlapping any solid? */
  private roomToStand(): boolean {
    const h = this.tuning.height;
    const r = centredRect(this.x, this.feetY - h / 2, this.tuning.width - 2, h - 1);
    return !this.solids.some((s) => overlaps(r, s));
  }

  private heightFor(p: Posture): number {
    if (p === 'roll') return this.tuning.rollHeight;
    if (p === 'low') return this.tuning.lowHeight;
    return this.tuning.height;
  }

  /** Resizes the body (and placeholder) for the posture, keeping the feet in place. */
  private applyPosture(p: Posture): void {
    let h = this.heightFor(p);
    if (h > this.height && !this.roomToStand()) h = this.height; // never grow into a ceiling
    if (h === this.height) return;
    const feet = this.feetY;
    const w = this.tuning.width;
    this.height = h;
    // Change the real size (not scale) and sync the body immediately, so it never overlaps the floor for a frame.
    this.sprite.setSize(w, h);
    this.sprite.updateDisplayOrigin();
    this.sprite.setPosition(this.sprite.x, feet - h / 2);
    this.body.setSize(w, h);
    this.body.updateFromGameObject();
    // Arcade moves the shape by (position - previous position) after each step. Resizing moved the body's
    // top edge, so mark the new position as the previous one or the shape gets dragged into the floor.
    this.body.prev.copy(this.body.position);
    this.body.prevFrame.copy(this.body.position);
  }

  get vx(): number {
    return this.body.velocity.x;
  }

  set vx(v: number) {
    this.body.setVelocityX(v);
  }

  get vy(): number {
    return this.body.velocity.y;
  }

  set vy(v: number) {
    this.body.setVelocityY(v);
  }

  get invulnerable(): boolean {
    return this.timers.invulnerable > 0 || this.fsm.current === 'finisher' || this.fsm.current === 'transform';
  }

  get damageMultiplier(): number {
    return this.strength.damageMultiplier * this.relicDamage * (this.form === 'crusnik' ? crusnikConfig.damageMultiplier : 1) * (this.winged ? WINGED_DAMAGE : 1);
  }

  /** The nearest valid finisher in front of the player, or null. */
  private findFinisher(): { def: FinisherDef; target: FinisherTarget } | null {
    let best: { def: FinisherDef; target: FinisherTarget } | null = null;
    for (const t of this.finisherTargets()) {
      const def = chooseFinisher(this.form, this.weapon, this.x, this.y, this.facing, t);
      if (def && (!best || Math.abs(t.x - this.x) < Math.abs(best.target.x - this.x))) best = { def, target: t };
    }
    return best;
  }

  get finisherReady(): boolean {
    return this.findFinisher() !== null;
  }

  beginFinisher(): void {
    const f = this.findFinisher();
    if (!f) return;
    if (f.target.x !== this.x) this.facing = f.target.x > this.x ? 1 : -1;
    this.finishTarget = f.target;
    this.finishing.begin(f.def, f.target);
  }

  tickFinisher(dtMs: number): boolean {
    const def = this.finishing.current;
    const target = this.finishTarget;
    if (!def || !target) return true;
    if (this.finishing.tick(dtMs, this.facing)) {
      this.health.heal(def.heal);
      if (def.buff) this.strength.apply(def.buff.damageMultiplier, def.buff.durationMs);
      this.onFinisher?.(def, target, this.facing);
    }
    return this.finishing.done;
  }

  endFinisher(): void {
    this.finishing.stop();
    this.finishTarget = null;
  }

  hurtbox(): Rect {
    return centredRect(this.x, this.y, this.tuning.width, this.height);
  }

  get alive(): boolean {
    return !this.health.dead;
  }

  receiveHit(hit: HitInfo): boolean {
    if (this.parryWindow && hit.parryable !== false && !this.health.dead) {
      this.parryWindow = false;
      this.parryHit = true;
      this.parryPending = true;
      this.timers.invulnerable = Math.max(this.timers.invulnerable, this.tuning.parrySuccessInvulnerableMs);
      this.onParry?.();
      return false;
    }
    return this.takeHit(hit);
  }

  /** Applies a hit unless invulnerable or dead. Returns true if it landed. */
  takeHit(hit: HitInfo): boolean {
    if (this.invulnerable || this.health.dead) return false;
    this.health.damage(hit.damage > 0 ? damageTaken(hit.damage) : 0);
    this.timers.invulnerable = this.tuning.hurtInvulnerableMs;
    this.blinkMs = this.tuning.hurtInvulnerableMs;
    this.vx = hit.knockbackX;
    this.vy = -hit.knockbackY;
    if (hit.knockbackX !== 0) this.facing = hit.knockbackX > 0 ? -1 : 1; // face the attacker
    this.fsm.transition('hurt');
    return true;
  }

  /** Crouched on the ground (prays at an altar). */
  /** Holy water flasks left. */
  flasks = this.tuning.flasks;

  get healWanted(): boolean {
    return this.input.justPressed('heal') && this.flasks > 0 && this.health.hp < this.health.max;
  }

  drinkFlask(): void {
    if (this.flasks <= 0) return;
    this.flasks--;
    this.health.heal(this.tuning.flaskHeal);
    this.onHealed?.();
  }

  /** Called after a flask heals (HUD refresh lives in the scene). */
  onHealed: (() => void) | null = null;

  get moveY(): number {
    return this.input.moveY;
  }

  /** Feet on the floor the ladder leads up to (one tile above the ladder's first tile). */
  private ladderTopY(): number {
    return (this.ladder?.y ?? 0) - LADDER_TOP_OFFSET;
  }

  /** On the ladder's span: feet below its top floor and not below its bottom. */
  get ladderHere(): boolean {
    const l = this.ladder;
    return l !== null && this.feetY > this.ladderTopY() + 1 && this.feetY <= l.y + l.h + 2;
  }

  /** Standing on the floor at the ladder's top (stick down climbs down). */
  get ladderBelow(): boolean {
    return this.ladder !== null && this.onGround && Math.abs(this.feetY - this.ladderTopY()) <= 2;
  }

  get atLadderTop(): boolean {
    return this.ladder !== null && this.feetY <= this.ladderTopY() + 1;
  }

  setClimbing(on: boolean): void {
    this.body.setAllowGravity(!on);
    if (!on || !this.ladder) return;
    this.sprite.x = this.ladder.x + this.ladder.w / 2;
    // Coming down from the top floor: step just below it so the ladder takes over.
    if (this.feetY <= this.ladderTopY() + 2) this.sprite.y += LADDER_STEP_DOWN;
    this.body.updateFromGameObject();
    // Same as resize: without this Arcade drags the shape back by the snap and it catches on narrow shafts.
    this.body.prev.copy(this.body.position);
    this.body.prevFrame.copy(this.body.position);
    this.vy = 0;
  }

  /** Start climbing the ladder in reach (after crossing a room edge mid-climb). */
  forceClimb(): void {
    this.fsm.transition('climb');
  }

  finishClimbAtTop(): void {
    this.body.setAllowGravity(true);
    this.sprite.y = this.ladderTopY() - this.height / 2;
    this.body.updateFromGameObject();
    this.vy = 0;
  }

  /** The ledge being held (kept from the grab through the pull-up). */
  private ledge: Ledge | null = null;
  /** ms before another ledge can be caught (after letting go). */
  private ledgeRegrabMs = 0;

  private ledgeToward(dir: 1 | -1): Ledge | null {
    if (this.height < this.tuning.height) return null;
    const w = this.tuning.width;
    return findLedge(this.x, this.sprite.y - this.height / 2, w, this.height, dir, this.solids, this.tuning);
  }

  get ledgeAhead(): boolean {
    if (this.ledgeRegrabMs > 0 || this.moveX === 0 || this.winged) return false;
    return this.ledgeToward(this.moveX > 0 ? 1 : -1) !== null;
  }

  grabLedge(): void {
    if (this.moveX !== 0) this.ledge = this.ledgeToward(this.moveX > 0 ? 1 : -1) ?? this.ledge;
    const l = this.ledge;
    if (!l) return;
    this.facing = l.dir;
    this.body.setAllowGravity(false);
    const at = hangCentre(l, this.tuning.width, this.height, this.tuning.ledgeHeadAbove);
    this.moveBodyTo(at.x, at.y);
  }

  pullUpLedge(): void {
    const l = this.ledge;
    if (!l) return;
    this.ledge = null;
    const at = standCentre(l, this.tuning.width, this.height, LEDGE_STEP_IN);
    this.moveBodyTo(at.x, at.y);
    this.airTopY = at.y;
  }

  releaseLedge(): void {
    this.body.setAllowGravity(true);
    if (this.ledge) this.ledgeRegrabMs = this.tuning.ledgeRegrabMs;
  }

  /** Snap the body somewhere without Arcade dragging it back (same trick as setClimbing). */
  private moveBodyTo(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.body.updateFromGameObject();
    this.body.prev.copy(this.body.position);
    this.body.prevFrame.copy(this.body.position);
    this.vx = 0;
    this.vy = 0;
  }

  /** Walking into a low ledge (a stair step): lift onto it if there is room. */
  private stepUp(): void {
    if (!this.onGround || this.moveX === 0) return;
    const dir = this.moveX > 0 ? 1 : -1;
    const blocked = dir > 0 ? this.body.blocked.right : this.body.blocked.left;
    if (!blocked) return;
    const w = this.tuning.width;
    const lift = this.tuning.stepUpMax;
    const ahead = centredRect(this.x + dir * 2, this.y - lift - 1, w - 2, this.height - 2);
    if (this.stepSolids.some((s) => overlaps(ahead, s))) return;
    this.sprite.y -= lift;
    this.sprite.x += dir * 2;
    this.body.updateFromGameObject();
  }

  dropThrough(): void {
    this.dropMs = DROP_THROUGH_MS;
    this.body.setVelocityY(DROP_NUDGE);
  }

  get kneeling(): boolean {
    return this.fsm.current === 'crouch';
  }

  /** Sets health directly (carried between rooms). */
  setHealth(hp: number): void {
    this.health.reset();
    this.health.damage(this.health.max - hp);
  }

  /** Moves the player without changing health (e.g. back to safe ground after spikes). */
  placeAt(x: number, feetY: number): void {
    this.applyPosture('stand');
    const y = feetY - this.height / 2;
    this.sprite.setPosition(x, y);
    this.body.reset(x, y);
    this.airTopY = y;
    this.fsm.transition('idle');
  }

  /** Puts the player back at a spawn point with full health. */
  respawn(x: number, y: number): void {
    this.applyPosture('stand');
    this.sprite.setPosition(x, y);
    this.body.reset(x, y);
    this.health.reset();
    this.strength.clear();
    this.endCrusnik();
    this.timers.invulnerable = this.tuning.hurtInvulnerableMs;
    this.blinkMs = this.tuning.hurtInvulnerableMs;
    this.airTopY = y;
    this.fsm.transition('idle');
  }

  update(dtMs: number): void {
    const y = this.sprite.y;
    if (!this.onGround) this.airTopY = Math.min(this.airTopY, y);
    this.fallDistance = y - this.airTopY;

    this.timers.tick({
      dtMs,
      jumpPressed: this.input.justPressed('jump'),
      onGround: this.onGround,
      velocityY: this.vy,
    });
    this.canStand = this.height >= this.tuning.height || this.roomToStand();
    this.fsm.update(dtMs);
    this.applyPosture(postureFor(this.fsm.current));

    if (this.onGround) this.airTopY = y;
    // World gravity is already applied; add the difference for the current phase of the jump.
    this.body.setGravityY(gravityFor(this.vy, this.tuning) - this.worldGravity);

    this.strength.tick(dtMs);
    if (!this.winged && this.crusnik.tick(dtMs)) this.setForm('priest');
    if (this.fsm.current === 'run' || this.fsm.current === 'idle') this.stepUp();
    this.dropMs = Math.max(0, this.dropMs - dtMs);
    this.ledgeRegrabMs = Math.max(0, this.ledgeRegrabMs - dtMs);
    this.blinkMs = Math.max(0, this.blinkMs - dtMs);
    const blinkOff = this.blinkMs > 0 && Math.floor(this.blinkMs / BLINK_MS) % 2 === 0;
    this.alpha = blinkOff ? 0.2 : this.invulnerable ? INVULNERABLE_ALPHA : 1;
    this.sprite.setAlpha(this.alpha);
  }

  /** Kneeling at an altar (set by the scene during the prayer). */
  praying = false;

  /** Which look to show: the state, or a variant of it (slow run = walk, still on a ladder, praying). */
  private visualKey(): VisualKey {
    const s = this.fsm.current;
    if (this.praying) return 'pray';
    if (s === 'run' && Math.abs(this.vx) < this.tuning.runSpeed * WALK_LOOK_FRACTION) return 'walk';
    if (s === 'climb' && this.vy === 0) return 'climbStill';
    return s;
  }

  private syncView(): void {
    this.facingMark.setPosition(this.sprite.x + this.facing * (this.tuning.width / 2 - 2), this.sprite.y - this.height / 2 + 7);
    this.view.update(this.visualKey(), this.combat.current?.id ?? this.finishing.current?.id ?? null, this.sprite.x, this.feetY, this.facing, this.alpha, this.form, this.winged, this.weapon);
  }
}
