import Phaser from 'phaser';
import type { Attacker, ContactHazard } from '../combat/CombatSystem';
import type { Damageable, Rect } from '../combat/types';
import { MarchesaBrain } from '../enemies/boss/MarchesaBrain';
import { Marchesa } from '../enemies/boss/Marchesa';
import { Duelist } from '../enemies/boss/Duelist';
import type { ArenaFighter } from '../enemies/boss/ArenaFighter';
import type { DuelistConfig } from '../enemies/boss/DuelistBrain';
import type { FlyerManager } from '../enemies/flyers/FlyerManager';
import { BossBar } from '../ui/BossBar';
import type { RoomData } from './tiled';
import { testHookEnabled } from '../systems/testHook';
import paula from '../data/bosses/paula.json';
import kampfer from '../data/bosses/kampfer.json';
import petros from '../data/bosses/petros.json';
import dietrich from '../data/bosses/dietrich.json';
import gyula from '../data/bosses/gyula.json';
import cain from '../data/bosses/cain.json';
import janissary from '../data/bosses/janissary.json';
import radu from '../data/bosses/radu.json';

const TILE = 16;
const WALL_W = 16;
/** Abel must be this far inside the arena (and on the ground) before the walls rise. */
const START_MARGIN = 40;
const WALL_COLOR = 0x5a0f1e;
const DUELISTS = { paula, kampfer, petros, dietrich, gyula, cain, janissary, radu } as unknown as Record<string, DuelistConfig>;

export interface ArenaHooks {
  /** Play a cutscene; gameplay waits until `done`. */
  playCutscene(id: string, done: () => void): void;
  /** The phase cutscene finished (e.g. Abel's first transformation happens now). */
  onPhaseScene(id: string): void;
  /** The fight is over (and the outro played): grant the relic, open the way. */
  onDefeated(flag: string, relic: string): void;
}

/**
 * A boss room's fight: the boss waits until Abel walks into the arena; an intro cutscene may play; then string
 * curtains seal both sides, the camera locks to the arena and the bar appears. A phase change can hold for a
 * cutscene. When the boss falls (or yields) the outro cutscene plays and `onDefeated` runs.
 */
export class BossArena {
  private readonly boss: ArenaFighter;
  private readonly bar: BossBar;
  private readonly walls: Phaser.GameObjects.GameObject[] = [];
  private readonly wallRects: Rect[] = [];
  private started = false;
  private fighting = false;
  private ended = false;
  private readonly left: number;
  private readonly right: number;
  private readonly floorY: number;
  private readonly flag: string;
  private readonly intro: string | null;
  private readonly outro: string | null;

  constructor(
    private readonly scene: Phaser.Scene,
    room: RoomData,
    private readonly solids: Phaser.Physics.Arcade.StaticGroup,
    private readonly solidRects: Rect[],
    private readonly flyers: FlyerManager,
    private readonly hooks: ArenaHooks,
  ) {
    const b = room.boss!;
    this.left = b.arenaLeft;
    this.right = b.arenaRight;
    this.floorY = b.y;
    this.flag = b.defeatFlag;
    this.intro = b.intro ?? null;
    this.outro = b.outro ?? null;
    if (b.id === 'marchesa') {
      const brain = new MarchesaBrain(b.x, b.arenaLeft, b.arenaRight);
      const above = room.solids.filter((s) => s.x <= b.x && s.x + s.w >= b.x && s.y + s.h <= b.y - 2 * TILE);
      const ceiling = above.length ? Math.max(...above.map((s) => s.y + s.h)) : 0;
      this.boss = new Marchesa(scene, brain, b.y, ceiling);
    } else {
      const cfg = DUELISTS[b.id];
      if (!cfg) throw new Error(`unknown boss "${b.id}"`);
      this.boss = new Duelist(scene, cfg, b.x, b.arenaLeft, b.arenaRight, b.y);
    }
    // Test mode only: ?test&bossHp=N starts the boss with N health (victory-flow playtests).
    const testHp = testHookEnabled() ? Number(new URLSearchParams(location.search).get('bossHp') ?? NaN) : NaN;
    if (testHp > 0) this.setHealth(testHp);
    this.bar = new BossBar(scene, this.boss.name);
  }

  private setHealth(hp: number): void {
    const f = this.boss as unknown as { brain: { health: { damage(n: number): number; max: number } } };
    f.brain.health.damage(f.brain.health.max - hp);
  }

  /** The fight is on (walls up, boss acting). */
  get active(): boolean {
    return this.fighting && !this.ended;
  }

  get fighter(): ArenaFighter {
    return this.boss;
  }

  get targets(): Damageable[] {
    return this.active ? [this.boss] : [];
  }
  get attackers(): Attacker[] {
    return this.active ? [this.boss] : [];
  }
  hazards(playerBox: Rect): ContactHazard[] {
    return this.active ? this.boss.hazards(playerBox) : [];
  }

  update(dtMs: number, playerX: number, playerOnGround: boolean, playerFeetY = this.floorY): void {
    if (!this.started && playerOnGround && playerX > this.left + START_MARGIN && playerX < this.right - START_MARGIN) this.start();
    this.boss.update(dtMs, playerX, this.active, Math.max(0, this.floorY - playerFeetY));
    if (!this.started) return;
    this.bar.set(this.boss.healthFraction);
    this.bar.update(dtMs);
    if (!this.active) return;
    for (const s of this.boss.drainSummons()) {
      for (let i = 0; i < s.count; i++) this.flyers.spawn(s.creature, this.left + 40 + Math.random() * (this.right - this.left - 80), this.floorY - 70);
    }
    if (this.boss.drainPhaseChange() && this.boss.phaseScene) {
      const id = this.boss.phaseScene;
      this.boss.holdPhase(true);
      this.hooks.playCutscene(id, () => {
        this.hooks.onPhaseScene(id);
        this.boss.holdPhase(false);
      });
    }
    if (this.boss.finished) this.finish();
  }

  private start(): void {
    this.started = true;
    this.raiseWalls();
    this.bar.show(true);
    const go = (): void => {
      this.fighting = true;
    };
    if (this.intro) this.hooks.playCutscene(this.intro, go);
    else go();
  }

  private raiseWalls(): void {
    const cam = this.scene.cameras.main;
    const h = this.scene.physics.world.bounds.height;
    for (const x of [this.left - WALL_W, this.right]) {
      const rect = { x, y: 0, w: WALL_W, h };
      const wall = this.scene.add.rectangle(x + WALL_W / 2, h / 2, WALL_W, h, WALL_COLOR, 0).setDepth(8);
      this.solids.add(wall);
      this.walls.push(wall);
      this.wallRects.push(rect);
      this.solidRects.push(rect);
      // A curtain of crimson strings drops into place.
      const curtain = this.scene.add.graphics().setDepth(8.5);
      for (let i = 0; i < 6; i++) curtain.lineStyle(1, 0xb0122a, 0.9).lineBetween(x + 2 + i * 2.4, 0, x + 2 + i * 2.4, h);
      curtain.setY(-h);
      this.scene.tweens.add({ targets: curtain, y: 0, duration: 500, ease: 'Quad.easeIn' });
      this.walls.push(curtain);
    }
    cam.setBounds(this.left - WALL_W, 0, this.right - this.left + WALL_W * 2, h);
  }

  private finish(): void {
    this.ended = true;
    this.bar.show(false);
    const done = (): void => {
      for (const w of this.walls) w.destroy();
      for (const r of this.wallRects) {
        const i = this.solidRects.indexOf(r);
        if (i >= 0) this.solidRects.splice(i, 1);
      }
      const b = this.scene.physics.world.bounds;
      this.scene.cameras.main.setBounds(b.x, b.y, b.width, b.height);
      this.boss.destroy();
      this.hooks.onDefeated(this.flag, this.boss.relic);
    };
    if (this.outro) this.hooks.playCutscene(this.outro, done);
    else done();
  }
}
