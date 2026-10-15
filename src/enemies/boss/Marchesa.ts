import Phaser from 'phaser';
import { COLORS } from '../../core/constants';
import { centredRect } from '../../combat/geometry';
import { nextEntityId } from '../../combat/ids';
import type { ContactHazard } from '../../combat/CombatSystem';
import type { Damageable, HitInfo, Rect } from '../../combat/types';
import { SpriteView, type StateVisual } from '../../systems/sprites/SpriteView';
import { MarchesaBrain, type MarchesaState } from './MarchesaBrain';
import type { ArenaFighter } from './ArenaFighter';

const DEPTH = 9.5;
const ANIM = 'boss_marchesa_';
const TELEGRAPH = 0xd9963a;
const CHARGE_GLOW = 0xd4283e;
const FLASH_MS = 90;
const STRING = 0xb0122a;
const SHOCK = 0xd4283e;
const AURA = 0x8a2a3a;

/** Which pose each state shows. Attacks pick their frame by phase (wind-up / strike). */
function visualFor(b: MarchesaBrain): StateVisual | null {
  const s: MarchesaState = b.state;
  const strike = b.combat.phase === 'active' || b.combat.phase === 'recovery';
  switch (s) {
    case 'intro':
      return { anim: `${ANIM}hang` };
    case 'idle':
      return { anim: `${ANIM}idle` };
    case 'walk':
      return { anim: `${ANIM}walk` };
    case 'slash1':
      return { anim: `${ANIM}slash`, frame: strike ? 1 : 0 };
    case 'slash2':
      return strike ? { anim: `${ANIM}lunge` } : { anim: `${ANIM}slash`, frame: 0 };
    case 'leap':
    case 'hang':
      return { anim: `${ANIM}leap` };
    case 'dive':
      return { anim: `${ANIM}dive` };
    case 'impact':
    case 'tired':
      return { anim: `${ANIM}impact` };
    case 'staggered':
    case 'strings':
      return { anim: `${ANIM}staggered` };
    case 'reappear':
    case 'charge':
      return { anim: `${ANIM}charge` };
    case 'dead':
      return { anim: `${ANIM}death` };
    case 'vanish':
      return null;
  }
}

/** A shockwave from the plummet: jump over it (a parry can't stop it). */
class Shock implements ContactHazard {
  alive = true;
  constructor(
    private readonly x: number,
    private readonly floorY: number,
    private readonly w: number,
    private readonly h: number,
    readonly contactDamage: number,
  ) {}
  hurtbox(): Rect {
    return { x: this.x - this.w / 2, y: this.floorY - this.h, w: this.w, h: this.h };
  }
  contactHit(targetX: number): HitInfo {
    const dir = targetX >= this.x ? 1 : -1;
    return { damage: this.contactDamage, knockbackX: dir * 120, knockbackY: 160, hitstopMs: 60, shakeMs: 100, shakeIntensity: 0.005, parryable: false };
  }
}

/**
 * The Marchesa in the scene: draws the brain's state (sprite, strings, shockwaves, telegraph glow) and plugs it
 * into combat as an attacker (her sabre), a target (her hurtbox) and hazards (shockwaves).
 */
export class Marchesa implements Damageable, ArenaFighter {
  readonly id = nextEntityId();
  private readonly view: SpriteView;
  private readonly placeholder: Phaser.GameObjects.Rectangle;
  private readonly fx: Phaser.GameObjects.Graphics;
  /** A faint crimson aura behind her so she reads against the dark ballroom. */
  private readonly aura: Phaser.GameObjects.Ellipse;
  private flashMs = 0;
  /** Strings fall away when they snap (phase 2); how far along that is. */
  private snapMs = 0;

  constructor(
    scene: Phaser.Scene,
    readonly brain: MarchesaBrain,
    private readonly floorY: number,
    private readonly ceilingY: number,
  ) {
    this.view = new SpriteView(scene, `${ANIM}idle`, DEPTH);
    this.placeholder = scene.add.rectangle(0, 0, brain.cfg.width, brain.cfg.height, 0x5a1424).setDepth(DEPTH).setVisible(false);
    this.fx = scene.add.graphics().setDepth(DEPTH + 0.1);
    this.aura = scene.add.ellipse(0, 0, 54, 76, AURA, 0.32).setDepth(DEPTH - 0.1).setBlendMode(Phaser.BlendModes.ADD);
  }

  private phaseChanged = false;
  readonly relic = 'sanguis';
  readonly phaseScene = undefined;
  get name(): string {
    return this.brain.cfg.name;
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
    return this.brain.phase;
  }
  holdPhase(_on: boolean): void {
    /* her phase change plays in-game (the strings snap); no cutscene */
  }
  drainSummons(): { creature: string; count: number }[] {
    return [];
  }
  drainPhaseChange(): boolean {
    const p = this.phaseChanged;
    this.phaseChanged = false;
    return p;
  }

  // --- Attacker (her sabre) ---
  get combat() {
    return this.brain.combat;
  }
  get x(): number {
    return this.brain.x;
  }
  /** Centre of her body (the hurtbox), lifted while she leaps. */
  get y(): number {
    return this.floorY - this.brain.lift - this.brain.cfg.height / 2;
  }
  get facing(): 1 | -1 {
    return this.brain.facing;
  }
  onParried(): void {
    this.brain.parried();
  }

  // --- Damageable ---
  get alive(): boolean {
    return this.brain.alive;
  }
  hurtbox(): Rect {
    return centredRect(this.x, this.y, this.brain.cfg.width, this.brain.cfg.height);
  }
  receiveHit(hit: HitInfo): boolean {
    const dealt = this.brain.takeDamage(hit.damage);
    if (dealt <= 0) return false;
    this.flashMs = FLASH_MS;
    return true;
  }

  /** The live shockwaves as contact hazards for this frame. */
  hazards(_playerBox?: Rect): ContactHazard[] {
    const s = this.brain.cfg.shockwave;
    return this.brain.shockwaves.map((w) => new Shock(w.x, this.floorY, s.width, s.height, s.damage));
  }

  update(dtMs: number, playerX = 0, active = false): void {
    this.flashMs = Math.max(0, this.flashMs - dtMs);
    const b = this.brain;
    if (active) b.update(dtMs, playerX);
    for (const e of b.drainEvents()) if (e === 'phase2') this.phaseChanged = true;
    if (b.phase === 2) this.snapMs += dtMs;
    const feetY = this.floorY - b.lift;
    const fading = b.state === 'dead' ? Math.max(0.35, 1 - b.stateMs / b.cfg.deathMs) : 1;
    const alpha = b.state === 'reappear' ? Math.min(1, b.stateMs / 200) : fading;
    const shown = b.visible && this.view.show(visualFor(b), b.x, feetY, b.facing, alpha);
    this.placeholder.setVisible(b.visible && !shown).setPosition(b.x, this.y);
    this.aura.setVisible(b.visible && b.state !== 'dead').setPosition(b.x, feetY - b.cfg.height / 2 - 4).setAlpha(alpha * (b.telegraphing ? 0.55 : 0.32));
    const sprite = this.view.sprite;
    if (sprite && shown) {
      sprite.clearTint();
      if (this.flashMs > 0) sprite.setTintFill(COLORS.flash);
      else if (b.state === 'reappear' || b.state === 'charge') sprite.setTint(CHARGE_GLOW);
      else if (b.telegraphing) sprite.setTint(TELEGRAPH);
    }
    this.draw(feetY);
  }

  private draw(feetY: number): void {
    const g = this.fx;
    const b = this.brain;
    g.clear();
    // Marionette strings from her wrists and shoulders up into the dark; they snap at phase 2 and fall away.
    if (b.visible && b.state !== 'dead') {
      const top = feetY - b.cfg.height;
      const anchors = [b.x - 9, b.x - 4, b.x + 4, b.x + 9];
      const fall = b.phase === 2 ? Math.min(1, this.snapMs / 900) : 0;
      if (fall < 1) {
        g.lineStyle(1, STRING, 1 - fall);
        for (const ax of anchors) {
          const y0 = top + 10;
          const y1 = this.ceilingY + (y0 - this.ceilingY) * fall;
          g.lineBetween(ax, y0, ax + (b.phase === 2 ? 6 : 0) * fall, y1);
        }
      }
    }
    // Shockwaves: low crimson arcs racing along the floor.
    const s = b.cfg.shockwave;
    for (const w of b.shockwaves) {
      g.fillStyle(SHOCK, 0.85).fillTriangle(w.x - s.width / 2, this.floorY, w.x + s.width / 2, this.floorY, w.x + (w.dir * s.width) / 3, this.floorY - s.height);
      g.fillStyle(0xf2d0d6, 0.9).fillRect(w.x - 1, this.floorY - s.height + 3, 2, s.height - 3);
    }
  }

  destroy(): void {
    this.view.sprite?.destroy();
    this.placeholder.destroy();
    this.fx.destroy();
    this.aura.destroy();
  }
}
