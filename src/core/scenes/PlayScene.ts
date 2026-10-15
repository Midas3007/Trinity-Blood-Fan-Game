import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, SCENES } from '../constants';
import { Player } from '../../player/Player';
import { ActionState } from '../../systems/input/ActionState';
import { mergeFrames } from '../../systems/input/actions';
import { GamepadSource } from '../../systems/input/GamepadSource';
import { KeyboardSource } from '../../systems/input/KeyboardSource';
import { EventBus } from '../../systems/EventBus';
import type { GameEvents } from '../../systems/gameEvents';
import { HitStop } from '../../combat/HitStop';
import { SparkPool } from '../../combat/SparkPool';
import { ShotFlash } from '../../combat/ShotFlash';
import { CombatSystem } from '../../combat/CombatSystem';
import { activeHitbox } from '../../combat/resolve';
import type { Rect } from '../../combat/types';
import { EnemyManager, type EnemySpawn } from '../../enemies/EnemyManager';
import { TrainingDummy, type DummyConfig } from '../../enemies/TrainingDummy';
import { DebugOverlay } from '../../ui/DebugOverlay';
import { Hud } from '../../ui/Hud';
import { TouchControls } from '../../ui/TouchControls';
import type { TouchLayout } from '../../ui/touchLayout';
import { installTestHook, testHookEnabled } from '../../systems/testHook';
import controls from '../../data/controls.json';
import effects from '../../data/effects.json';
import physics from '../../data/physics.json';
import testRoom from '../../data/testRoom.json';

/** Long frames (tab switches, hitches) are clamped so timers and states don't jump. */
const MAX_FRAME_MS = 50;
const FLOOR_Y = 238;
/** Extra pooled enemies per type beyond the room's spawn count. */
const ENEMY_POOL_SPARE = 1;

/** Test room: floor, ledges, training dummies and the placeholder player. */
export class PlayScene extends Phaser.Scene {
  private player!: Player;
  private dummies: TrainingDummy[] = [];
  private enemies!: EnemyManager;
  private combatSystem!: CombatSystem;
  private readonly actions = new ActionState();
  private readonly bus = new EventBus<GameEvents>();
  private readonly hitStop = new HitStop();
  private keyboard: KeyboardSource | null = null;
  private gamepad!: GamepadSource;
  private touch!: TouchControls;
  private debug!: DebugOverlay;
  private hud!: Hud;
  private sparks!: SparkPool;
  private shotFlash!: ShotFlash;

  constructor() {
    super(SCENES.play);
  }

  create(): void {
    const { width, height } = testRoom;
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);

    const solids = this.physics.add.staticGroup();
    const solidRects: Rect[] = testRoom.solids;
    for (const r of solidRects) {
      solids.add(this.add.rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, COLORS.floor));
    }

    for (const l of testRoom.labels) {
      this.add
        .text(l.x, l.y, l.text, { fontFamily: 'monospace', fontSize: '8px', color: COLORS.textDim })
        .setOrigin(0.5, 1);
    }

    this.player = new Player(this, testRoom.spawn.x, testRoom.spawn.y, this.actions, physics.gravityY, solidRects);
    this.physics.add.collider(this.player.sprite, solids);
    this.cameras.main.startFollow(this.player.sprite, true);
    this.cameras.main.setFollowOffset(0, GAME_HEIGHT * 0.1);

    this.dummies = (testRoom.dummies as DummyConfig[]).map((cfg) => {
      const d = new TrainingDummy(this, cfg, FLOOR_Y);
      this.physics.add.collider(d.sprite, solids);
      return d;
    });

    const spawns: EnemySpawn[] = testRoom.enemies;
    this.enemies = new EnemyManager(this, this.player, solidRects, solids, testRoom.enemyRespawnMs);
    for (const type of new Set(spawns.map((sp) => sp.type))) {
      this.enemies.preload(type, spawns.filter((sp) => sp.type === type).length + ENEMY_POOL_SPARE);
    }
    for (const sp of spawns) this.enemies.spawn(sp);
    this.combatSystem = new CombatSystem(this.bus, this.player);

    this.sparks = new SparkPool(this, effects.maxSparks, COLORS.spark, effects.sparkLifeMs, effects.sparkSpeed);
    this.shotFlash = new ShotFlash(this, COLORS.flash, effects.shotFlashMs);
    this.player.finisherTargets = () => this.enemies.active;
    this.player.onFinisher = (def, target, direction) => {
      const fromX = this.player.x + direction * effects.gunForward;
      const fromY = this.player.y + effects.gunDown;
      this.bus.emit('combat:finisher', {
        finisher: def.id, x: target.x, y: target.y, fromX, fromY, direction,
        hitstopMs: def.hitstopMs, shakeMs: def.shakeMs, shakeIntensity: def.shakeIntensity,
      });
      this.bus.emit('enemy:died', { id: target.id, x: target.x, y: target.y });
    };
    this.hud = new Hud(this);
    this.keyboard = this.input.keyboard
      ? new KeyboardSource(this.input.keyboard, () => this.game.loop.time)
      : null;
    this.gamepad = new GamepadSource(this.input.gamepad);
    this.touch = new TouchControls(this, controls as TouchLayout);
    this.debug = new DebugOverlay(this, controls.debugToggle);

    this.wireFeedback();
    if (testHookEnabled()) {
      const uninstall = installTestHook(() => this.snapshot());
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, uninstall);
    }

    // Drop held touches when the page is hidden so nothing stays "pressed" after returning.
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.touch.releaseAll, this.touch);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.touch.releaseAll, this.touch);
      this.bus.clear();
    });
  }

  /** Hit feedback listens to events; combat code never calls effects directly. */
  private wireFeedback(): void {
    this.bus.on('combat:hit', ({ x, y, hit }) => {
      this.hitStop.trigger(hit.hitstopMs);
      // Pause now: physics steps before the next scene update, so waiting would let one frame of knockback through.
      if (this.hitStop.active) this.physics.world.pause();
      if (effects.screenShake && hit.shakeMs > 0) this.cameras.main.shake(hit.shakeMs, hit.shakeIntensity);
      if (effects.sparks) this.sparks.burst(x, y, effects.sparksPerHit, Math.sign(hit.knockbackX));
    });
    this.bus.on('combat:finisher', (f) => {
      this.hitStop.trigger(f.hitstopMs);
      if (this.hitStop.active) this.physics.world.pause();
      if (effects.screenShake && f.shakeMs > 0) this.cameras.main.shake(f.shakeMs, f.shakeIntensity);
      if (f.finisher === 'revolver') this.shotFlash.fire(f.fromX, f.fromY, f.x, f.y);
      if (effects.sparks) this.sparks.burst(f.x, f.y, effects.shotSparks, f.direction);
      this.hud.setHealth(this.player.health.fraction);
    });
    this.bus.on('player:hurt', ({ hp, max }) => this.hud.setHealth(hp / max));
    this.bus.on('player:died', () => {
      this.player.respawn(testRoom.spawn.x, testRoom.spawn.y);
      this.hud.setHealth(1);
    });
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, MAX_FRAME_MS);

    // Hit-stop: freeze gameplay and physics. Inputs are not read, so presses made now are kept for the next frame.
    if (this.hitStop.tick(dt)) {
      this.physics.world.pause();
      return;
    }
    if (this.physics.world.isPaused) this.physics.world.resume();

    const frames = [this.touch.read(), this.gamepad.read()];
    if (this.keyboard) frames.push(this.keyboard.read());
    this.actions.update(mergeFrames(frames));

    this.player.update(dt);
    for (const d of this.dummies) d.update(dt);
    this.enemies.update(dt);
    const living = this.enemies.alive;
    this.combatSystem.step([...this.dummies, ...living], living, this.dummies);
    this.sparks.update(dt);
    this.shotFlash.update(dt);

    const boxes: Rect[] = [];
    for (const a of [this.player, ...living]) {
      const box = activeHitbox(a.combat, a.x, a.y, a.facing);
      if (box) boxes.push(box);
    }
    this.debug.drawHitboxes(boxes);
    this.debug.update({
      state: `${this.player.state}${this.player.invulnerable ? ' INV' : ''} [${this.player.view.label}]`,
      vel: `${this.player.vx.toFixed(0)},${this.player.vy.toFixed(0)}`,
      x: this.player.x,
      y: this.player.y,
      input: `${this.actions.moveX.toFixed(2)} ${this.actions.heldSummary()}`,
      hp: `${this.player.health.hp}/${this.player.health.max}`,
    });
  }

  private snapshot() {
    const p = this.player;
    return {
      time: this.game.loop.time,
      fps: this.game.loop.actualFps,
      player: {
        state: p.state,
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        hp: p.health.hp,
        invulnerable: p.invulnerable,
        facing: p.facing,
        height: p.bodyHeight,
        view: p.view.label,
        strength: p.damageMultiplier,
      },
      enemies: this.enemies.active.map((e) => ({ type: e.cfg.type, state: e.state, view: e.viewLabel, x: e.x, y: e.y, hp: e.health.hp })),
      dummies: this.dummies.map((d) => ({ x: d.x, hp: d.health.hp, alive: d.alive })),
    };
  }
}
