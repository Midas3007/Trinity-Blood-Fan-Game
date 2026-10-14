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
import { overlaps } from '../../combat/geometry';
import { activeHitbox, resolveAttack } from '../../combat/resolve';
import { TrainingDummy, type DummyConfig } from '../../enemies/TrainingDummy';
import { DebugOverlay } from '../../ui/DebugOverlay';
import { Hud } from '../../ui/Hud';
import { TouchControls } from '../../ui/TouchControls';
import type { TouchLayout } from '../../ui/touchLayout';
import controls from '../../data/controls.json';
import effects from '../../data/effects.json';
import physics from '../../data/physics.json';
import testRoom from '../../data/testRoom.json';

/** Long frames (tab switches, hitches) are clamped so timers and states don't jump. */
const MAX_FRAME_MS = 50;
const FLOOR_Y = 238;

/** Test room: floor, ledges, training dummies and the placeholder player. */
export class PlayScene extends Phaser.Scene {
  private player!: Player;
  private dummies: TrainingDummy[] = [];
  private readonly actions = new ActionState();
  private readonly bus = new EventBus<GameEvents>();
  private readonly hitStop = new HitStop();
  private keyboard: KeyboardSource | null = null;
  private gamepad!: GamepadSource;
  private touch!: TouchControls;
  private debug!: DebugOverlay;
  private hud!: Hud;
  private sparks!: SparkPool;

  constructor() {
    super(SCENES.play);
  }

  create(): void {
    const { width, height } = testRoom;
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);

    const solids = this.physics.add.staticGroup();
    for (const r of testRoom.solids) {
      solids.add(this.add.rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, COLORS.floor));
    }

    this.player = new Player(this, testRoom.spawn.x, testRoom.spawn.y, this.actions, physics.gravityY);
    this.physics.add.collider(this.player.sprite, solids);
    this.cameras.main.startFollow(this.player.sprite, true);
    this.cameras.main.setFollowOffset(0, GAME_HEIGHT * 0.1);

    this.dummies = (testRoom.dummies as DummyConfig[]).map((cfg) => {
      const d = new TrainingDummy(this, cfg, FLOOR_Y);
      this.physics.add.collider(d.sprite, solids);
      return d;
    });

    this.sparks = new SparkPool(this, effects.maxSparks, COLORS.spark, effects.sparkLifeMs, effects.sparkSpeed);
    this.hud = new Hud(this);
    this.keyboard = this.input.keyboard
      ? new KeyboardSource(this.input.keyboard, () => this.game.loop.time)
      : null;
    this.gamepad = new GamepadSource(this.input.gamepad);
    this.touch = new TouchControls(this, controls as TouchLayout);
    this.debug = new DebugOverlay(this, controls.debugToggle);

    this.wireFeedback();

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
      if (effects.screenShake && hit.shakeMs > 0) this.cameras.main.shake(hit.shakeMs, hit.shakeIntensity);
      if (effects.sparks) this.sparks.burst(x, y, effects.sparksPerHit, Math.sign(hit.knockbackX));
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
    this.resolveCombat();
    this.sparks.update(dt);

    const box = activeHitbox(this.player.combat, this.player.x, this.player.y, this.player.facing);
    this.debug.drawHitboxes(box ? [box] : []);
    this.debug.update({
      state: `${this.player.state}${this.player.invulnerable ? ' INV' : ''}`,
      vel: `${this.player.vx.toFixed(0)},${this.player.vy.toFixed(0)}`,
      x: this.player.x,
      y: this.player.y,
      input: `${this.actions.moveX.toFixed(2)} ${this.actions.heldSummary()}`,
      hp: `${this.player.health.hp}/${this.player.health.max}`,
    });
  }

  private resolveCombat(): void {
    const p = this.player;
    for (const r of resolveAttack(p.combat, p.x, p.y, p.facing, this.dummies)) {
      this.bus.emit('combat:hit', { x: r.x, y: r.y, hit: r.hit, targetId: r.target.id, byPlayer: true });
      if (!r.target.alive) this.bus.emit('enemy:died', { id: r.target.id, x: r.target.x, y: r.y });
    }

    for (const d of this.dummies) {
      if (!d.alive || d.contactDamage <= 0 || p.invulnerable) continue;
      if (!overlaps(p.hurtbox(), d.hurtbox())) continue;
      const hit = d.contactHit(p.x);
      if (!p.takeHit(hit)) continue;
      this.bus.emit('combat:hit', { x: p.x, y: p.y, hit, targetId: p.id, byPlayer: false });
      this.bus.emit('player:hurt', { hp: p.health.hp, max: p.health.max });
      if (p.health.dead) this.bus.emit('player:died', {});
    }
  }
}
