import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../constants';
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
import { room as getRoom, START } from '../../world/rooms';
import { RoomRuntime } from '../../world/RoomRuntime';
import { RoomTiles } from '../../world/RoomTiles';
import { Backdrop, timeLook, type TimeOfDay } from '../../world/Backdrop';
import { landsOnTop } from '../../world/oneWay';
import { roomAtPixel } from '../../world/roomGraph';
import { rooms as allRooms } from '../../world/rooms';
import { TILE } from '../../world/tiled';
import { playerTuning } from '../../player/tuning';
import { LorePanel } from '../../ui/LorePanel';
import { MapOverlay } from '../../ui/MapOverlay';
import { PauseMenu } from '../../ui/PauseMenu';
import { CornerButtons } from '../../ui/CornerButtons';
import type { RoomData } from '../../world/tiled';
import { gameState } from '../../systems/GameState';
import { saveStore } from '../../systems/save/SaveStore';
import { crusnikConfig } from '../../player/CrusnikMeter';
import { Banner } from '../../ui/Banner';
import { ChainLashView } from '../../combat/ChainLashView';
import { loreEntry } from '../../ui/LorePanel';
import { BossArena } from '../../world/BossArena';
import { playerStats, relic } from '../../systems/progression';
import { cutscene } from './CutsceneScene';
import { FlyerManager } from '../../enemies/flyers/FlyerManager';
import { isFlyer } from '../../enemies/flyers/FlyerBrain';

/** Long frames (tab switches, hitches) are clamped so timers and states don't jump. */
const MAX_FRAME_MS = 50;
/** Training dummies regrow after this long (ms). */
const DUMMY_RESPAWN_MS = 1500;
/** Enemies stay dead until the room is re-entered or the player prays. */
const ENEMY_RESPAWN_MS = 0;
const FADE_MS = 120;
/** Half the standing body height: spawn points are feet, edge crossings use the body centre. */
const PLAYER_HALF_HEIGHT = playerTuning.height / 2;
const ROOM_TITLE_MS = 1800;
/** Length of the prayer ceremony at an altar (ms). */
const PRAYER_MS = 1800;

/** Where to put the player when a room starts. */
export interface RoomStart {
  room: string;
  entry?: string;
  checkpoint?: string;
  /** Crossing from a neighbouring room: world position (body centre) and velocity to keep. */
  world?: { x: number; y: number; vx: number; vy: number; facing: 1 | -1; climbing?: boolean };
}

/** How far inside the new room to place the player after crossing an edge (px). */
const EDGE_INSET = 6;
/** How close (px, horizontally) the player must be to a ladder's centre to grab it. */
const LADDER_REACH_X = 12;
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
  private roomData!: RoomData;
  private runtime!: RoomRuntime;
  private arena: BossArena | null = null;
  private flyers!: FlyerManager;
  private start: RoomStart = { room: START.room, entry: START.entry };
  private leaving = false;
  /** Must stand up once before praying again (no loop when spawning at an altar while holding down). */
  private prayArmed = false;
  private safe = { x: 0, y: 0 };
  private lorePanel!: LorePanel;
  private tiles!: RoomTiles;
  private backdrop!: Backdrop;
  private map!: MapOverlay;
  /** The prayer ceremony at an altar (ms elapsed and which altar), or null. */
  private praying: { ms: number; checkpoint: string } | null = null;
  private pauseMenu!: PauseMenu;
  private shotFlash!: ShotFlash;
  private banner!: Banner;
  private chain!: ChainLashView;

  constructor() {
    super(SCENES.play);
  }

  init(data: Partial<RoomStart>): void {
    this.start = data.room ? (data as RoomStart) : { room: START.room, entry: START.entry };
    // Test mode only: ?test&room=<id> starts in any room (automated playtests).
    const forced = testHookEnabled() && !data.room ? new URLSearchParams(location.search).get('room') : null;
    if (forced) this.start = { room: forced };
    this.leaving = false;
    this.prayArmed = false;
    this.praying = null;
    this.dummies = [];
    this.arena = null;
  }

  /** Feet position for the player at the start of this room. */
  private spawnPoint(): { x: number; y: number; facing: 1 | -1; vx?: number; vy?: number } {
    const r = this.roomData;
    const w = this.start.world;
    if (w) {
      // Same world position as when we left the last room, nudged inside this one; feet = centre + half height.
      const x = Phaser.Math.Clamp(w.x - r.originX, EDGE_INSET, r.width - EDGE_INSET);
      // Feet stay inside the room too, so climbing up through the floor edge lands on this room's ladder.
      const centre = Phaser.Math.Clamp(w.y - r.originY, EDGE_INSET, r.height - EDGE_INSET);
      const y = Math.min(centre + PLAYER_HALF_HEIGHT, r.height - 1);
      return { x, y, facing: w.facing, vx: w.vx, vy: w.vy };
    }
    const cp = this.start.checkpoint ? r.checkpoints.find((c) => c.id === this.start.checkpoint) : undefined;
    if (cp) return { x: cp.x, y: cp.y, facing: 1 };
    const named = r.entries[this.start.entry ?? ''] ?? Object.values(r.entries)[0];
    if (named) return named;
    // No entry marker (rooms you normally enter through an edge): stand on the first ground in the middle.
    const x = r.width / 2;
    const ground = r.solids.concat(r.oneways).filter((g) => g.y > 0 && x >= g.x && x <= g.x + g.w).sort((a, b) => a.y - b.y)[0];
    return { x, y: ground ? ground.y : r.height / 2, facing: 1 };
  }

  /** Painted art for this room (house fronts, interiors) is loaded when the room starts. */
  preload(): void {
    const r = getRoom(this.start.room);
    for (const im of r.images) if (!this.textures.exists(im.key)) this.load.image(im.key, `assets/rooms/${im.key}.png`);
  }

  create(): void {
    this.roomData = getRoom(this.start.room);
    gameState.visit(this.roomData.id);
    const r = this.roomData;
    const { width, height } = r;
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);

    // Test mode only: ?test&time=day|dusk|night.
    const forcedTime = testHookEnabled() ? new URLSearchParams(location.search).get('time') : null;
    if (forcedTime === 'day' || forcedTime === 'dusk' || forcedTime === 'night') gameState.time = forcedTime as TimeOfDay;
    this.backdrop = new Backdrop(this, gameState.time, r.width, r.outdoor, r.horizon);
    this.tiles = new RoomTiles(this, r);
    const tiled = r.layers.terrain.length > 0;
    const solids = this.physics.add.staticGroup();
    const solidRects: Rect[] = [...r.solids];
    for (const s of solidRects) {
      // Tile rooms draw their own art; the collision boxes stay invisible.
      solids.add(this.add.rectangle(s.x + s.w / 2, s.y + s.h / 2, s.w, s.h, COLORS.floor).setVisible(!tiled));
    }
    const oneways = this.physics.add.staticGroup();
    for (const o of r.oneways) {
      const rect = this.add.rectangle(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h, COLORS.stone).setVisible(!tiled);
      oneways.add(rect);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }

    for (const l of r.labels) {
      this.add
        .text(l.x, l.y, l.text, { fontFamily: 'monospace', fontSize: '8px', color: COLORS.textDim })
        .setOrigin(0.5, 1);
    }

    this.runtime = new RoomRuntime(this, r, gameState, solids, solidRects, timeLook(gameState.time).lampGlow);
    const at = this.spawnPoint();
    this.player = new Player(this, at.x, at.y - 20, this.actions, physics.gravityY, solidRects);
    this.player.placeAt(at.x, at.y);
    this.player.facing = at.facing;
    if (gameState.hp !== null) this.player.setHealth(gameState.hp);
    this.safe = { x: at.x, y: at.y };
    this.physics.add.collider(this.player.sprite, solids);
    this.player.stepSolids = solidRects;
    this.physics.add.collider(this.player.sprite, oneways, undefined, (_p, o) =>
      landsOnTop(this.player.body, (o as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody, this.player.dropMs > 0 || this.player.state === 'climb'),
    );
    if (at.vx !== undefined) this.player.body.setVelocity(at.vx, at.vy ?? 0);
    // Climbing up or down a ladder through the room edge: keep climbing in this room.
    if (this.start.world?.climbing) {
      this.senseLadders();
      if (this.player.ladderHere) this.player.forceClimb();
    }
    this.cameras.main.startFollow(this.player.sprite, true);
    this.cameras.main.setFollowOffset(0, GAME_HEIGHT * 0.1);

    this.dummies = r.dummies.map((dm) => {
      const cfg: DummyConfig = { x: dm.x, maxHealth: dm.maxHealth, contactDamage: dm.contactDamage, respawnMs: DUMMY_RESPAWN_MS };
      const d = new TrainingDummy(this, cfg, dm.y);
      this.physics.add.collider(d.sprite, solids);
      return d;
    });

    // Flying creatures (fairies, bats) have their own manager; everything else walks.
    const spawns: EnemySpawn[] = r.enemies.filter((sp) => !isFlyer(sp.type));
    // Enemies sense floors and ledges on solids and one-way platforms alike.
    this.enemies = new EnemyManager(this, this.player, [...solidRects, ...r.oneways], solids, ENEMY_RESPAWN_MS, oneways);
    for (const type of new Set(spawns.map((sp) => sp.type))) {
      this.enemies.preload(type, spawns.filter((sp) => sp.type === type).length + ENEMY_POOL_SPARE);
    }
    // Test mode only: ?test&peaceful spawns no enemies (mechanics playtests).
    const peaceful = testHookEnabled() && new URLSearchParams(location.search).has('peaceful');
    if (!peaceful) for (const sp of spawns) this.enemies.spawn(sp);
    this.flyers = new FlyerManager(this, peaceful ? [] : r.enemies.filter((sp) => isFlyer(sp.type)));
    if (r.boss && !gameState.hasFlag(r.boss.defeatFlag)) {
      this.arena = new BossArena(this, r, solids, solidRects, this.flyers, {
        playCutscene: (id, done) => this.playCutscene(id, done),
        onPhaseScene: (id) => this.phaseSceneDone(id),
        onDefeated: (flag, relicId) => this.bossDefeated(flag, relicId),
      });
    }
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
    // Relics from beaten bosses: more health, flasks and damage.
    const stats = playerStats((f) => gameState.hasFlag(f));
    this.player.applyStats(stats);
    if (gameState.hp !== null) this.player.setHealth(Math.min(gameState.hp, stats.maxHealth));
    this.player.flasks = gameState.flasks ?? stats.flasks;
    this.hud = new Hud(this, stats.flasks);
    this.hud.setHealth(this.player.health.fraction);
    this.hud.setFlasks(this.player.flasks);
    this.player.onHealed = () => {
      this.hud.setHealth(this.player.health.fraction);
      this.hud.setFlasks(this.player.flasks);
    };
    // Crusnik form: awakened by a flag, blood meter and form carried between rooms.
    const cm = this.player.crusnik;
    // Test mode only: ?test&crusnik awakens the form with a full meter (ability playtests).
    const testCrusnik = testHookEnabled() && new URLSearchParams(location.search).has('crusnik') && !gameState.hasFlag(crusnikConfig.unlockFlag);
    if (testCrusnik) gameState.setFlag(crusnikConfig.unlockFlag);
    cm.unlocked = gameState.hasFlag(crusnikConfig.unlockFlag);
    if (gameState.crusnik) cm.restore(gameState.crusnik);
    if (testCrusnik) cm.fill();

    this.player.resumeCrusnik();
    this.banner = new Banner(this);
    this.chain = new ChainLashView(this);
    this.player.onFormChange = (form) => {
      if (form === 'crusnik') {
        this.cameras.main.flash(220, 212, 40, 62);
        if (effects.screenShake) this.cameras.main.shake(200, 0.008);
      } else {
        this.cameras.main.flash(160, 120, 140, 170);
      }
    };
    this.map = new MapOverlay(this);
    this.pauseMenu = new PauseMenu(
      this,
      () => this.setPaused(null),
      () => {
        saveStore.save(gameState.toSave(Date.now()));
        this.scene.start(SCENES.menu);
      },
    );
    new CornerButtons(this, () => this.setPaused(this.map.open ? null : 'map'), () => this.setPaused(this.pauseMenu.open ? null : 'pause'));
    this.input.keyboard?.on('keydown-M', () => this.setPaused(this.map.open ? null : 'map'));
    this.input.keyboard?.on('keydown-ESC', () => this.setPaused(this.pauseMenu.open || this.map.open ? null : 'pause'));
    this.lorePanel = new LorePanel(this);
    this.cameras.main.fadeIn(FADE_MS);
    const title = this.add
      .text(GAME_WIDTH / 2, 28, r.title, { fontFamily: 'serif', fontSize: '12px', color: COLORS.text, stroke: '#0b0a10', strokeThickness: 3 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50);
    this.tweens.add({ targets: title, alpha: 0, delay: ROOM_TITLE_MS, duration: 600 });
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
    this.bus.on('combat:hit', ({ targetId, byPlayer }) => {
      // Blood for the Crusnik meter: real targets only (not levers).
      if (byPlayer && !this.runtime.levers.some((l) => l.id === targetId)) this.player.crusnik.gain(crusnikConfig.gainPerHit);
    });
    this.bus.on('enemy:died', () => this.player.crusnik.gain(crusnikConfig.gainPerKill));
    this.bus.on('combat:parry', ({ x, y }) => {
      // Steel on steel: a sharp freeze, white sparks, a short shake.
      this.hitStop.trigger(effects.parryHitstopMs);
      if (this.hitStop.active) this.physics.world.pause();
      if (effects.sparks) this.sparks.burst(x, y, effects.sparksPerHit * 2, this.player.facing);
      if (effects.screenShake) this.cameras.main.shake(90, 0.004);
      this.cameras.main.flash(60, 255, 245, 220);
    });
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
      if (f.finisher === 'bloodDrain') this.player.crusnik.feed(crusnikConfig.gainPerDrain);
      if (effects.sparks) this.sparks.burst(f.x, f.y, effects.shotSparks, f.direction);
      this.hud.setHealth(this.player.health.fraction);
    });
    this.bus.on('player:hurt', ({ hp, max }) => this.hud.setHealth(hp / max));
    this.bus.on('player:died', () => {
      // Back to the last altar prayed at (or the start), at full health.
      gameState.hp = null;
      const cp = gameState.checkpoint;
      this.goTo(cp ? { room: cp.room, checkpoint: cp.id } : { room: START.room, entry: START.entry });
    });
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, MAX_FRAME_MS);
    if (this.cutsceneOn) return;
    if (this.map.open || this.pauseMenu.open) {
      this.map.update(dt);
      return;
    }
    this.hud.update(dt);
    if (this.praying) {
      this.updatePrayer(dt);
      return;
    }

    // Hit-stop: freeze gameplay and physics. Inputs are not read, so presses made now are kept for the next frame.
    if (this.hitStop.tick(dt)) {
      this.physics.world.pause();
      return;
    }
    if (this.physics.world.isPaused) this.physics.world.resume();

    const frames = [this.touch.read(), this.gamepad.read()];
    if (this.keyboard) frames.push(this.keyboard.read());
    this.actions.update(mergeFrames(frames));

    this.backdrop.update(dt);
    this.senseLadders();
    this.player.update(dt);
    if (this.leaving) return;
    this.updateRoom();
    for (const d of this.dummies) d.update(dt);
    this.enemies.update(dt);
    const living = this.enemies.alive;
    const arena = this.arena;
    if (arena) {
      arena.update(dt, this.player.x, this.player.onGround);
    }
    const p0 = this.player;
    this.flyers.update(dt, p0.x, p0.y);
    this.combatSystem.step(
      [...this.dummies, ...living, ...this.runtime.levers, ...(arena?.targets ?? []), ...this.flyers.targets],
      [...living, ...(arena?.attackers ?? [])],
      [...this.dummies, ...(arena?.hazards(p0.hurtbox()) ?? []), ...this.flyers.hazards(p0.hurtbox(), p0.x, p0.y)],
    );
    this.sparks.update(dt);
    this.shotFlash.update(dt);
    const p = this.player;
    this.hud.setCrusnik(p.crusnik.fraction, p.crusnik.unlocked, p.crusnik.ready);
    this.chain.update(p.state === 'lash' ? activeHitbox(p.combat, p.x, p.y, p.facing) : null, p.x + p.facing * 8, p.y - 4, p.facing);

    const boxes: Rect[] = [];
    for (const a of [this.player, ...living, ...(this.arena?.attackers ?? [])]) {
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

  /** Exits, spikes and altars. */
  private updateRoom(): void {
    const p = this.player;
    if (!p.kneeling) this.prayArmed = true;
    this.tiles.update(this.game.loop.delta, p.x, p.y);
    p.onOneway = p.onGround && this.standingOnOneway();
    if (this.crossEdge()) return;
    const lore = p.onGround ? this.runtime.loreAt(p.x) : null;
    this.lorePanel.show(lore);
    if (lore) {
      gameState.setFlag(`lore:${lore}`);
      const unlock = loreEntry(lore)?.unlocks;
      if (unlock && !gameState.hasFlag(unlock)) this.unlock(unlock);
    }
    const ev = this.runtime.update(p);
    if (!ev) {
      if (p.onGround && this.runtime.safeAt(p.x)) this.safe = { x: p.x, y: p.feetY };
      return;
    }
    if (ev.type === 'exit') {
      this.goTo({ room: ev.exit.to, entry: ev.exit.entry });
    } else if (ev.type === 'hazard') {
      // Spikes hurt, then put you back on the last solid ground.
      if (!p.invulnerable) {
        p.takeHit({ damage: ev.damage, knockbackX: 0, knockbackY: 0, hitstopMs: 0, shakeMs: 120, shakeIntensity: 0.006 });
        this.bus.emit('player:hurt', { hp: p.health.hp, max: p.health.max });
        if (p.health.dead) {
          this.bus.emit('player:died', {});
          return;
        }
      }
      p.placeAt(this.safe.x, this.safe.y);
    } else if (ev.type === 'pray' && this.prayArmed) {
      this.startPrayer(ev.checkpoint);
    }
  }

  /** The ladder in reach: its column near the player and its span (plus the floor at its top) around the feet. */
  private senseLadders(): void {
    const p = this.player;
    p.ladder =
      this.roomData.ladders.find(
        (l) => Math.abs(p.x - (l.x + l.w / 2)) <= LADDER_REACH_X && p.feetY >= l.y - TILE - 2 && p.feetY <= l.y + l.h + 2,
      ) ?? null;
  }

  /** Is the player standing on a one-way platform (not solid ground)? */
  private standingOnOneway(): boolean {
    const feet = this.player.feetY;
    const x = this.player.x;
    return this.roomData.oneways.some((o) => Math.abs(o.y - feet) <= 2 && x >= o.x && x <= o.x + o.w);
  }

  /** Walked, fell or jumped off this room's edge: continue in whichever room is there. */
  private crossEdge(): boolean {
    const p = this.player;
    const r = this.roomData;
    const out = p.x < 0 || p.x > r.width || p.y > r.height || (p.y < 0 && p.vy < 0);
    if (!out) return false;
    const wx = r.originX + p.x;
    const wy = r.originY + p.y;
    const next = roomAtPixel(allRooms, wx, wy, TILE);
    if (!next || next.id === r.id) return false; // open sky with nothing above: just come back down
    this.goTo({ room: next.id, world: { x: wx, y: wy, vx: p.vx, vy: p.vy, facing: p.facing, climbing: p.state === 'climb' } });
    return true;
  }

  /** Kneel at an altar: a beam of light, the dove of the Holy Spirit descends over Abel, then rest. */
  private startPrayer(checkpoint: string): void {
    const p = this.player;
    this.praying = { ms: 0, checkpoint };
    p.body.setVelocity(0, 0);
    p.praying = true;
    const head = p.feetY - playerTuning.lowHeight - 6;
    const beam = this.add.rectangle(p.x, head - 100, 14, 200, 0xf6e3a3, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(32);
    this.tweens.add({ targets: beam, fillAlpha: 0.22, duration: 400, yoyo: true, hold: PRAYER_MS - 800 });
    if (this.textures.exists('dove')) {
      const dove = this.add.sprite(p.x + 2, head - 70, 'dove', 0).setDepth(33);
      if (this.anims.exists('dove_fly')) dove.play('dove_fly');
      this.tweens.add({ targets: dove, y: head - 4, duration: PRAYER_MS * 0.55, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: dove, alpha: 0, delay: PRAYER_MS * 0.8, duration: PRAYER_MS * 0.2 });
    }
  }

  private updatePrayer(dt: number): void {
    const pr = this.praying!;
    pr.ms += dt;
    if (pr.ms < PRAYER_MS) return;
    // Rested: full health and flasks, this altar is the respawn point, enemies return.
    gameState.checkpoint = { room: this.roomData.id, id: pr.checkpoint };
    gameState.useAltar(this.roomData.id, pr.checkpoint);
    gameState.hp = null;
    gameState.flasks = null;
    this.cameras.main.flash(250, 246, 227, 163);
    this.goTo({ room: this.roomData.id, checkpoint: pr.checkpoint });
  }

  /** The boss fell and her last words are done: open the way on and save. */
  /** A boss fell (or yielded) and the outro played: open the way, grant the relic, show the Latin card, save. */
  private bossDefeated(flag: string, relicId: string): void {
    this.runtime.open(flag);
    this.arena = null;
    const r = relic(relicId);
    gameState.setFlag(r.flag);
    const stats = playerStats((f) => gameState.hasFlag(f));
    this.player.applyStats(stats);
    this.player.flasks = Math.min(stats.flasks, this.player.flasks + (r.flasks ?? 0));
    this.hud.setMaxFlasks(stats.flasks);
    this.hud.setFlasks(this.player.flasks);
    this.hud.setHealth(this.player.health.fraction);
    this.banner.show(r.card, r.gift);
    saveStore.save(gameState.toSave(Date.now()));
  }

  private cutsceneOn = false;

  /** Plays a cutscene over the game; gameplay waits until it ends. */
  private playCutscene(id: string, done: () => void): void {
    if (!cutscene(id)) {
      done();
      return;
    }
    this.cutsceneOn = true;
    this.touch.releaseAll();
    this.physics.world.pause();
    this.game.events.once(`cutscene-done:${id}`, () => {
      this.cutsceneOn = false;
      this.physics.world.resume();
      done();
    });
    this.scene.launch(SCENES.cutscene, { id });
    this.scene.bringToTop(SCENES.cutscene);
  }

  /** A boss's mid-fight cutscene ended. Kampfer's is Abel's first transformation: the Crusnik wakes, now. */
  private phaseSceneDone(id: string): void {
    if (id !== 'kampfer_awakening') return;
    gameState.setFlag(crusnikConfig.unlockFlag);
    const cm = this.player.crusnik;
    cm.unlocked = true;
    cm.fill();
    this.player.forceTransform();
    this.banner.show('NANOMACHINE CRUSNIK', 'Forty percent. ABIL throws the chain; the blue bar is his blood.', 2600);
  }

  /** A progression unlock from reading lore. Today only the Crusnik form. */
  private unlock(flag: string): void {
    gameState.setFlag(flag);
    if (flag !== crusnikConfig.unlockFlag) return;
    const cm = this.player.crusnik;
    cm.unlocked = true;
    cm.fill(); // ready at once, so the first try happens here
    this.cameras.main.flash(400, 140, 20, 40);
    if (effects.screenShake) this.cameras.main.shake(350, 0.01);
    this.banner.show('THE CRUSNIK STIRS', 'When the blue bar beneath your health glows, press ABIL to transform.\nAs the Crusnik: ATK scythe, ABIL chain lash, a far higher leap.');
    saveStore.save(gameState.toSave(Date.now()));
  }

  /** Open the map or pause menu (gameplay and physics stop), or close both (null). */
  private setPaused(what: 'map' | 'pause' | null): void {
    this.map.hide();
    this.pauseMenu.hide();
    if (what === 'map') this.map.show(allRooms, (id) => gameState.hasVisited(id), (room, id) => gameState.altarUsed(room, id), this.roomData, this.player.x, this.player.y);
    if (what === 'pause') this.pauseMenu.show();
    if (what) {
      this.physics.world.pause();
      this.touch.releaseAll();
    } else if (!this.hitStop.active) {
      this.physics.world.resume();
    }
  }

  /** Fade out and start another room (or restart this one), carrying health over. */
  private goTo(next: RoomStart): void {
    if (this.leaving) return;
    this.leaving = true;
    // Walking between rooms keeps your health; praying or dying refills it.
    gameState.hp = next.checkpoint === undefined && !this.player.health.dead ? this.player.health.hp : null;
    // Flasks carry over between rooms; praying and dying refill them.
    gameState.flasks = next.checkpoint === undefined && !this.player.health.dead ? this.player.flasks : null;
    // The blood meter carries over; praying or dying ends the form (the blood stays).
    const blood = this.player.crusnik.snapshot();
    gameState.crusnik = next.checkpoint === undefined && !this.player.health.dead ? blood : { value: blood.value, active: false };
    // Autosave on every room change and prayer (a loaded game resumes at the last altar).
    saveStore.save(gameState.toSave(Date.now()));
    this.physics.world.pause();
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart(next));
  }

  private snapshot() {
    const p = this.player;
    return {
      time: this.game.loop.time,
      fps: this.game.loop.actualFps,
      room: this.roomData.id,
      flags: gameState.toSave(0).flags,
      paused: this.pauseMenu.open ? "pause" : this.map.open ? "map" : null,
      checkpoint: gameState.checkpoint,
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
        form: p.form,
        parry: p.parryOpen,
        crusnik: p.crusnik.fraction,
        strength: p.damageMultiplier,
        // For playtest bots: is there no floor a short way ahead (a pit or hole)?
        gapAhead: !this.roomData.solids.concat(this.roomData.oneways).some((g) => {
          const ax = p.x + p.facing * 22;
          return ax >= g.x && ax <= g.x + g.w && p.feetY + 2 >= g.y && p.feetY + 2 <= g.y + g.h;
        }),
      },
      enemies: this.enemies.active.map((e) => ({ type: e.cfg.type, state: e.state, view: e.viewLabel, x: e.x, y: e.y, hp: e.health.hp })),
      dummies: this.dummies.map((d) => ({ x: d.x, hp: d.health.hp, alive: d.alive })),
      boss: this.arena
        ? { state: this.arena.fighter.stateLabel, hp: this.arena.fighter.healthFraction, phase: this.arena.fighter.phaseNumber, x: this.arena.fighter.x, active: this.arena.active, cutscene: this.cutsceneOn }
        : null,
    };
  }
}
