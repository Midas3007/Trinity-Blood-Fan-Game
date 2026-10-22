import Phaser from 'phaser';
import { COLORS } from '../../core/constants';
import { centredRect } from '../../combat/geometry';
import { nextEntityId } from '../../combat/ids';
import type { ContactHazard } from '../../combat/CombatSystem';
import type { HitInfo, Rect } from '../../combat/types';
import { SpriteView, type StateVisual } from '../../systems/sprites/SpriteView';
import type { ArenaFighter } from './ArenaFighter';
import { DuelistBrain, type DuelistConfig } from './DuelistBrain';

const DEPTH = 9.5;
const AMBER = 0xd9963a;
const RED = 0xd4283e;
const AURA_ALPHA = 0.28;
/** The glow when it shows a wind-up (telegraphGlow). */
const GLOW_ALPHA = 0.32;
const FLASH_MS = 90;
/** Hover bob: period (ms per radian) and height (px). */
const BOB_PERIOD = 260;
const BOB_PX = 3;
/** Lance strike streak: starts this far in front of his centre (px). */
const LANCE_FROM = 10;

/** A one-off hazard (a spell bolt or a floor shockwave) that can't be parried. */
class Blast implements ContactHazard {
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
    return { damage: this.contactDamage, knockbackX: dir * 130, knockbackY: 120, hitstopMs: 60, shakeMs: 110, shakeIntensity: 0.005, parryable: false };
  }
}

/** A data-driven mini boss in the scene (see DuelistBrain): sprite, telegraph glow, spells and shockwaves. */
export class Duelist implements ArenaFighter {
  readonly id = nextEntityId();
  readonly brain: DuelistBrain;
  private readonly view: SpriteView;
  private readonly placeholder: Phaser.GameObjects.Rectangle;
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly aura: Phaser.GameObjects.Ellipse;
  private readonly auraColor: number;
  private flashMs = 0;
  private t = 0;
  private phaseChanged = false;
  private summons: { creature: string; count: number }[] = [];

  constructor(
    scene: Phaser.Scene,
    cfg: DuelistConfig,
    x: number,
    arenaLeft: number,
    arenaRight: number,
    private readonly floorY: number,
  ) {
    this.brain = new DuelistBrain(cfg, x, arenaLeft, arenaRight);
    this.view = new SpriteView(scene, `boss_${cfg.phases[0]?.sprite ?? cfg.id}_idle`, DEPTH);
    this.placeholder = scene.add.rectangle(0, 0, cfg.width, cfg.height, 0x5a1424).setDepth(DEPTH).setVisible(false);
    this.fx = scene.add.graphics().setDepth(DEPTH + 0.1);
    this.auraColor = cfg.auraColor ? Number(cfg.auraColor.replace('#', '0x')) : 0x6a2a4a;
    this.aura = scene.add.ellipse(0, 0, cfg.width * 3, cfg.height * 1.5, this.auraColor, cfg.auraAlpha ?? AURA_ALPHA).setDepth(DEPTH - 0.1).setBlendMode(Phaser.BlendModes.ADD);
  }

  get name(): string {
    return this.brain.cfg.name;
  }
  get relic(): string {
    return this.brain.cfg.relic;
  }
  get phaseScene(): string | undefined {
    return this.brain.cfg.phaseScene;
  }
  get healthFraction(): number {
    return this.brain.health.fraction;
  }
  get beaten(): boolean {
    return !this.brain.alive;
  }
  get finished(): boolean {
    return this.brain.finished;
  }
  get stateLabel(): string {
    return this.brain.state;
  }
  get phaseNumber(): number {
    return this.brain.phaseIndex + 1;
  }
  holdPhase(on: boolean): void {
    this.brain.holdForScene = on;
  }
  drainSummons(): { creature: string; count: number }[] {
    const s = this.summons;
    this.summons = [];
    return s;
  }
  drainPhaseChange(): boolean {
    const p = this.phaseChanged;
    this.phaseChanged = false;
    return p;
  }

  // Attacker
  get combat() {
    return this.brain.combat;
  }
  get x(): number {
    return this.brain.x;
  }
  get y(): number {
    return this.floorY - this.brain.lift - this.brain.height / 2;
  }
  get facing(): 1 | -1 {
    return this.brain.facing;
  }
  onParried(): void {
    this.brain.parried();
  }

  // Damageable
  get alive(): boolean {
    return this.brain.alive;
  }
  hurtbox(): Rect {
    return centredRect(this.x, this.y, this.brain.width, this.brain.height);
  }
  receiveHit(hit: HitInfo): boolean {
    if (this.brain.takeDamage(hit.damage) <= 0) return false;
    this.flashMs = FLASH_MS;
    return true;
  }

  hazards(playerBox: Rect): ContactHazard[] {
    const out: ContactHazard[] = [];
    const p = this.brain.projectileHit(playerBox, this.floorY);
    if (p) out.push(new Blast(playerBox, p.cfg.damage, p.x));
    const w = this.brain.cfg.shockwave;
    for (const v of this.brain.waves) out.push(new Blast({ x: v.x - w.width / 2, y: this.floorY - w.height, w: w.width, h: w.height }, w.damage, v.x));
    const beam = this.brain.beamHit(playerBox);
    if (beam) out.push(new Blast(playerBox, beam.damage, beam.x));
    return out;
  }

  update(dtMs: number, playerX: number, active: boolean, playerLift = 0): void {
    this.flashMs = Math.max(0, this.flashMs - dtMs);
    this.t += dtMs;
    const b = this.brain;
    if (active) b.update(dtMs, playerX, playerLift);
    for (const e of b.drainEvents()) {
      if (e.type === 'phase') this.phaseChanged = true;
      if (e.type === 'summon') this.summons.push({ creature: e.creature, count: e.count });
    }
    // Floating: a slow bob (drawn only; hits use the brain's position).
    const bob = b.baseLift > 0 && b.state !== 'dive' ? Math.round(Math.sin(this.t / BOB_PERIOD) * BOB_PX) : 0;
    const feetY = this.floorY - b.lift + bob;
    this.placeholder.setSize(b.width, b.height);
    const key = b.state === 'attack' ? `attack:${b.attackId}` : b.state;
    const vis = b.phase.visuals ?? b.cfg.visuals;
    const pose = vis[key] ?? vis[b.state] ?? 'idle';
    const set = b.phase.sprite ?? b.cfg.id;
    const prefix = set.startsWith('npc_') ? set : `boss_${set}`;
    const v: StateVisual | null = b.visible ? { anim: `${prefix}_${pose}` } : null;
    const fade = b.state === 'defeated' ? Math.max(0.5, 1 - b.stateMs / b.cfg.deathMs) : 1;
    const shown = v !== null && this.view.show(v, b.x, feetY, b.facing, fade);
    this.placeholder.setVisible(b.visible && !shown).setPosition(b.x, this.y);
    this.aura.setVisible(b.visible && b.alive).setPosition(b.x, feetY - b.height / 2).setSize(b.width * 3, b.height * 1.5);
    const s = this.view.sprite;
    if (s && shown) {
      s.clearTint();
      const def = b.combat.current;
      const unparryable = def?.parryable === false || b.state === 'telegraph';
      const t = b.cfg.telegraphTints;
      const warn = t ? Number(t[unparryable ? 1 : 0].replace('#', '0x')) : unparryable ? RED : AMBER;
      const glow = b.cfg.telegraphGlow === true && b.telegraphing && this.flashMs <= 0;
      this.aura.setFillStyle(glow ? warn : this.auraColor, glow ? GLOW_ALPHA : (b.cfg.auraAlpha ?? AURA_ALPHA));
      if (this.flashMs > 0) s.setTintFill(COLORS.flash);
      else if (b.telegraphing && !b.cfg.telegraphGlow) s.setTint(warn);
    }
    this.draw();
    this.drawWeapon(feetY);
  }

  /** Cain's lance strike (the lance itself is in his sprites): a bright streak out to the far end of the hitbox. */
  private drawWeapon(feetY: number): void {
    const w = this.brain.cfg.weaponFx;
    const b = this.brain;
    const def = b.combat.current;
    if (!w || !b.visible || !def || b.combat.phase !== 'active') return;
    const y = feetY - b.height * 0.55;
    const tip = b.x + b.facing * (def.hitbox.x + def.hitbox.w / 2);
    const from = b.x + b.facing * LANCE_FROM;
    const g = this.fx;
    g.lineStyle(3, Number(w.color.replace('#', '0x')), 0.35).lineBetween(from, y, tip, y);
    g.lineStyle(1, Number(w.tip.replace('#', '0x')), 0.9).lineBetween(from, y, tip, y);
    g.fillStyle(Number(w.tip.replace('#', '0x')), 0.5).fillCircle(tip, y, 4);
  }


  private draw(): void {
    const g = this.fx;
    g.clear();
    for (const p of this.brain.projectiles) {
      const c = Number(p.cfg.color.replace('#', '0x'));
      const y = this.floorY - p.y;
      g.fillStyle(c, 0.35).fillCircle(p.x, y, p.cfg.size);
      g.fillStyle(c, 1).fillCircle(p.x, y, p.cfg.size / 2);
      g.fillStyle(0xffffff, 0.8).fillCircle(p.x, y, p.cfg.size / 5);
    }
    // Star beams: a thin pale mark on the floor, then a blinding column.
    for (const bm of this.brain.beams) {
      if (bm.ms < bm.markMs) {
        const a = 0.35 + 0.35 * Math.sin(bm.ms / 60);
        g.fillStyle(0xbfe0ef, a).fillRect(bm.x - bm.width / 2, this.floorY - 3, bm.width, 3);
        g.lineStyle(1, 0xbfe0ef, a * 0.6).lineBetween(bm.x, this.floorY, bm.x, this.floorY - 400);
      } else {
        g.fillStyle(0xbfe0ef, 0.35).fillRect(bm.x - bm.width, this.floorY - 600, bm.width * 2, 600);
        g.fillStyle(0xffffff, 0.9).fillRect(bm.x - bm.width / 2, this.floorY - 600, bm.width, 600);
      }
    }
    const w = this.brain.cfg.shockwave;
    for (const v of this.brain.waves) {
      g.fillStyle(RED, 0.85).fillTriangle(v.x - w.width / 2, this.floorY, v.x + w.width / 2, this.floorY, v.x + (v.dir * w.width) / 3, this.floorY - w.height);
    }
  }

  destroy(): void {
    this.view.sprite?.destroy();
    this.placeholder.destroy();
    this.fx.destroy();
    this.aura.destroy();
  }
}
