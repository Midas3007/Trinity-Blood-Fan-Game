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
const FLASH_MS = 90;

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
  private flashMs = 0;
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
    this.view = new SpriteView(scene, `boss_${cfg.id}_idle`, DEPTH);
    this.placeholder = scene.add.rectangle(0, 0, cfg.width, cfg.height, 0x5a1424).setDepth(DEPTH).setVisible(false);
    this.fx = scene.add.graphics().setDepth(DEPTH + 0.1);
    this.aura = scene.add.ellipse(0, 0, cfg.width * 3, cfg.height * 1.5, 0x6a2a4a, 0.28).setDepth(DEPTH - 0.1).setBlendMode(Phaser.BlendModes.ADD);
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
    return this.floorY - this.brain.lift - this.brain.cfg.height / 2;
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
    return centredRect(this.x, this.y, this.brain.cfg.width, this.brain.cfg.height);
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
    return out;
  }

  update(dtMs: number, playerX: number, active: boolean): void {
    this.flashMs = Math.max(0, this.flashMs - dtMs);
    const b = this.brain;
    if (active) b.update(dtMs, playerX);
    for (const e of b.drainEvents()) {
      if (e.type === 'phase') this.phaseChanged = true;
      if (e.type === 'summon') this.summons.push({ creature: e.creature, count: e.count });
    }
    const feetY = this.floorY - b.lift;
    const key = b.state === 'attack' ? `attack:${b.attackId}` : b.state;
    const pose = b.cfg.visuals[key] ?? b.cfg.visuals[b.state] ?? 'idle';
    const v: StateVisual | null = b.visible ? { anim: `boss_${b.cfg.id}_${pose}` } : null;
    const fade = b.state === 'defeated' ? Math.max(0.5, 1 - b.stateMs / b.cfg.deathMs) : 1;
    const shown = v !== null && this.view.show(v, b.x, feetY, b.facing, fade);
    this.placeholder.setVisible(b.visible && !shown).setPosition(b.x, this.y);
    this.aura.setVisible(b.visible && b.alive).setPosition(b.x, feetY - b.cfg.height / 2);
    const s = this.view.sprite;
    if (s && shown) {
      s.clearTint();
      const def = b.combat.current;
      const unparryable = def?.parryable === false || b.state === 'telegraph';
      if (this.flashMs > 0) s.setTintFill(COLORS.flash);
      else if (b.telegraphing) s.setTint(unparryable ? RED : AMBER);
    }
    this.draw();
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
