import Phaser from 'phaser';
import dialogue from '../data/dialogue.json';
import type { Attacker, ContactHazard } from '../combat/CombatSystem';
import type { Damageable, Rect } from '../combat/types';
import { MarchesaBrain } from '../enemies/boss/MarchesaBrain';
import { Marchesa } from '../enemies/boss/Marchesa';
import { BossBar } from '../ui/BossBar';
import { DialogueBox, type DialogueLine } from '../ui/DialogueBox';
import type { RoomData } from './tiled';
import { testHookEnabled } from '../systems/testHook';

const TILE = 16;
const WALL_W = 16;
/** Abel must be this far inside the arena (and on the ground) before the walls rise. */
const START_MARGIN = 40;
const WALL_COLOR = 0x5a0f1e;
const scenes = dialogue.scenes as Record<string, DialogueLine[]>;

/**
 * A boss room's fight: the boss waits (hanging in her strings) until Abel walks into the arena, then string
 * curtains seal both sides, the camera locks to the arena and the bar appears. When she falls, her last words
 * play and `onDefeated` runs (the scene sets the flag, which opens the way on).
 */
export class BossArena {
  private readonly boss: Marchesa;
  private readonly bar: BossBar;
  private readonly dialogue: DialogueBox;
  private readonly walls: Phaser.GameObjects.Rectangle[] = [];
  private readonly wallRects: Rect[] = [];
  private started = false;
  private ended = false;
  private readonly left: number;
  private readonly right: number;

  constructor(
    private readonly scene: Phaser.Scene,
    room: RoomData,
    private readonly solids: Phaser.Physics.Arcade.StaticGroup,
    private readonly solidRects: Rect[],
    private readonly onDefeated: () => void,
  ) {
    const b = room.boss!;
    this.left = b.arenaLeft;
    this.right = b.arenaRight;
    const brain = new MarchesaBrain(b.x, b.arenaLeft, b.arenaRight);
    // Test mode only: ?test&bossHp=N starts her with N health (victory-flow playtests).
    const testHp = testHookEnabled() ? Number(new URLSearchParams(location.search).get('bossHp') ?? NaN) : NaN;
    if (testHp > 0) brain.health.damage(brain.health.max - testHp);
    // Ceiling for the strings: the lowest solid above her.
    const above = room.solids.filter((s) => s.x <= b.x && s.x + s.w >= b.x && s.y + s.h <= b.y - 2 * TILE);
    const ceiling = above.length ? Math.max(...above.map((s) => s.y + s.h)) : 0;
    this.boss = new Marchesa(scene, brain, b.y, ceiling);
    this.bar = new BossBar(scene, brain.cfg.name);
    this.dialogue = new DialogueBox(scene);
  }

  /** The fight is on (walls up). */
  get active(): boolean {
    return this.started && !this.ended;
  }

  /** Dialogue showing: the scene stops gameplay input meanwhile. */
  get talking(): boolean {
    return this.dialogue.open;
  }

  get brain(): MarchesaBrain {
    return this.boss.brain;
  }

  /** For combat this frame: her body as a target, her sabre as an attacker, the shockwaves as hazards. */
  get targets(): Damageable[] {
    return this.active ? [this.boss] : [];
  }
  get attackers(): Attacker[] {
    return this.active ? [this.boss] : [];
  }
  get hazards(): ContactHazard[] {
    return this.active ? this.boss.hazards() : [];
  }

  advanceDialogue(): void {
    this.dialogue.advance();
  }

  update(dtMs: number, playerX: number, playerOnGround: boolean): void {
    this.dialogue.update(dtMs);
    if (!this.started) {
      if (playerOnGround && playerX > this.left + START_MARGIN && playerX < this.right - START_MARGIN) this.start();
      this.boss.update(dtMs); // hangs limp in her strings until then
      return;
    }
    if (!this.ended) this.boss.brain.update(dtMs, playerX);
    this.boss.update(dtMs);
    this.bar.set(this.boss.brain.health.fraction);
    this.bar.update(dtMs);
    if (!this.ended && this.boss.brain.finished) this.finish();
  }

  private start(): void {
    this.started = true;
    const cam = this.scene.cameras.main;
    const h = this.scene.physics.world.bounds.height;
    for (const x of [this.left - WALL_W, this.right]) {
      const rect = { x, y: 0, w: WALL_W, h };
      const wall = this.scene.add.rectangle(x + WALL_W / 2, h / 2, WALL_W, h, WALL_COLOR, 0.0).setDepth(8);
      this.solids.add(wall);
      this.walls.push(wall);
      this.wallRects.push(rect);
      this.solidRects.push(rect);
      // A curtain of crimson strings drops into place.
      const curtain = this.scene.add.graphics().setDepth(8.5);
      for (let i = 0; i < 6; i++) curtain.lineStyle(1, 0xb0122a, 0.9).lineBetween(x + 2 + i * 2.4, 0, x + 2 + i * 2.4, h);
      curtain.setY(-h);
      this.scene.tweens.add({ targets: curtain, y: 0, duration: 500, ease: 'Quad.easeIn' });
      this.walls.push(curtain as unknown as Phaser.GameObjects.Rectangle);
    }
    cam.setBounds(this.left - WALL_W, 0, this.right - this.left + WALL_W * 2, h);
    this.bar.show(true);
  }

  private finish(): void {
    this.ended = true;
    this.bar.show(false);
    this.dialogue.play(scenes['marchesa_defeated'] ?? [], () => {
      for (const w of this.walls) w.destroy();
      for (const r of this.wallRects) {
        const i = this.solidRects.indexOf(r);
        if (i >= 0) this.solidRects.splice(i, 1);
      }
      const cam = this.scene.cameras.main;
      const b = this.scene.physics.world.bounds;
      cam.setBounds(b.x, b.y, b.width, b.height);
      this.boss.destroy();
      this.onDefeated();
    });
  }
}
