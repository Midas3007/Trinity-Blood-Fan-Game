import Phaser from 'phaser';
import { TravelMenu } from '../../ui/TravelMenu';
import { destinations } from '../../world/fastTravel';
import { OptionsMenu } from '../../ui/OptionsMenu';
import { TouchLayoutEditor } from '../../ui/TouchLayoutEditor';
import { settings, touchLayoutFrom } from '../../systems/settings';
import { weapons } from '../../combat/attackData';
import { fx } from '../../systems/fx';
import { ItemPickups } from '../../world/ItemPickups';
import { currentWeapon, itemFlag, itemSets, items, ownedWeapons, setComplete } from '../../systems/items';
import { Codex } from '../../ui/Codex';
import { beastFlag } from '../../ui/codexData';
import { audio } from '../../systems/audio/AudioManager';
import { musicFor } from '../../systems/audio/music';
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
import { revealedInteriors } from '../../world/seeThrough';
import { cheat, CheatCode } from '../../systems/cheatCode';
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
import { bossBlood, crusnikConfig } from '../../player/CrusnikMeter';
import { Banner } from '../../ui/Banner';
import { ChainLashView } from '../../combat/ChainLashView';
import { loreEntry } from '../../ui/LorePanel';
import { BossArena } from '../../world/BossArena';
import { playerStats, relic } from '../../systems/progression';
import { cutscene } from '../cutscenes';
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
  /** Sent back to the altar by a fall into spikes or water: health, flasks and the blood meter stay as they were. */
  keepHealth?: boolean;
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
  private lorePanel!: LorePanel;
  private pickups!: ItemPickups;
  private tiles!: RoomTiles;
  private backdrop!: Backdrop;
  private map!: MapOverlay;
  /** The prayer ceremony at an altar (ms elapsed and which altar), or null. */
  private praying: { ms: number; checkpoint: string } | null = null;
  private pauseMenu!: PauseMenu;
  private codex!: Codex;
  private travel!: TravelMenu;
  /** Up must be let go between travels (so closing the menu does not reopen it). */
  private travelReady = true;
  private options!: OptionsMenu;
  private layoutEditor!: TouchLayoutEditor;
  private shotFlash!: ShotFlash;
  private banner!: Banner;
  private boltFx!: Phaser.GameObjects.Graphics;
  private doorHint!: Phaser.GameObjects.Text;
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
    // Test mode only: ?test&at=x,feetY starts at that spot (mechanics playtests).
    const at = testHookEnabled() ? new URLSearchParams(location.search).get('at')?.split(',').map(Number) : undefined;
    if (at && at.length === 2 && at.every(Number.isFinite)) return { x: at[0]!, y: at[1]!, facing: 1 };
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
    // Test mode only: ?test&flags=a,b starts with story flags set (recorded playthrough chapters).
    if (testHookEnabled()) for (const f of (new URLSearchParams(location.search).get('flags') ?? '').split(',')) if (f) gameState.setFlag(f);
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
    this.pickups = new ItemPickups(this, r.items, (id) => gameState.hasFlag(itemFlag(id)));
    const at = this.spawnPoint();
    this.player = new Player(this, at.x, at.y - 20, this.actions, physics.gravityY, solidRects);
    this.player.placeAt(at.x, at.y);
    this.player.facing = at.facing;
    if (gameState.hp !== null) this.player.setHealth(gameState.hp);
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
    // A new game opens with Abel's arrival in Istvan (once).
    if (r.id === START.room && !gameState.hasFlag('seen:opening') && !testHookEnabled()) {
      gameState.setFlag('seen:opening');
      this.time.delayedCall(50, () => this.playCutscene('opening', () => undefined));
    }
    // Test mode only: ?test&scene=<id> plays a cutscene when the room starts (once per page).
    const testScene = testHookEnabled() ? new URLSearchParams(location.search).get('scene') : null;
    if (testScene && !gameState.hasFlag(`seen:${testScene}`)) {
      gameState.setFlag(`seen:${testScene}`);
      this.time.delayedCall(50, () => this.playCutscene(testScene, () => undefined));
    }
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
    this.player.weapon = currentWeapon((f) => gameState.hasFlag(f));
    if (gameState.hp !== null) this.player.setHealth(Math.min(gameState.hp, stats.maxHealth));
    this.player.flasks = gameState.flasks ?? stats.flasks;
    this.hud = new Hud(this, stats.flasks);
    this.hud.setHealth(this.player.health.fraction);
    this.hud.setFlasks(this.player.flasks);
    this.player.onHealed = () => {
      audio.sfx('heal');
      this.hud.setHealth(this.player.health.fraction);
      this.hud.setFlasks(this.player.flasks);
    };
    // Crusnik form: awakened by a flag, blood meter and form carried between rooms.
    const cm = this.player.crusnik;
    // Test mode only: ?test&crusnik awakens the form with a full meter (ability playtests).
    const testCrusnik = testHookEnabled() && new URLSearchParams(location.search).has('crusnik') && !gameState.hasFlag(crusnikConfig.unlockFlag);
    if (testCrusnik) gameState.setFlag(crusnikConfig.unlockFlag);
    cm.unlocked = gameState.hasFlag(crusnikConfig.unlockFlag);
    cm.awake = gameState.hasFlag(crusnikConfig.meterFlag);
    if (gameState.crusnik) cm.restore(gameState.crusnik);
    if (testCrusnik) cm.fill();

    this.player.resumeCrusnik();
    this.banner = new Banner(this);
    this.chain = new ChainLashView(this);
    this.boltFx = this.add.graphics().setDepth(11);
    this.doorHint = this.add
      .text(0, 0, '', { fontFamily: 'serif', fontSize: '10px', color: '#eadfc4', stroke: '#0b0a10', strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(12)
      .setVisible(false);
    this.player.onFormChange = (form) => {
      if (form === 'crusnik') {
        audio.sfx('transform');
        fx.flash(this.cameras.main, 220, 212, 40, 62);
        if (fx.shakeOn) fx.shake(this.cameras.main, 200, 0.008);
      } else {
        fx.flash(this.cameras.main, 160, 120, 140, 170);
      }
    };
    this.map = new MapOverlay(this);
    const has = (f: string): boolean => gameState.hasFlag(f);
    const weaponLabel = (): string | null => (ownedWeapons(has).length > 1 ? `Weapon: ${weapons[this.player.weapon]?.short ?? this.player.weapon}` : null);
    this.pauseMenu = new PauseMenu(this, {
      resume: () => this.setPaused(null),
      title: () => {
        saveStore.save(gameState.toSave(Date.now()));
        this.scene.start(SCENES.menu);
      },
      codex: () => this.setPaused('codex'),
      options: () => this.setPaused('options'),
      weapon: () => {
        const owned = ownedWeapons(has);
        const next = owned[(owned.indexOf(this.player.weapon) + 1) % owned.length] ?? this.player.weapon;
        for (const w of owned) gameState.clearFlag(`weapon:${w}`);
        gameState.setFlag(`weapon:${next}`);
        this.player.weapon = next;
        return weaponLabel();
      },
      weaponLabel,
    });
    this.codex = new Codex(this, (f) => gameState.hasFlag(f), () => this.setPaused('pause'));
    this.travel = new TravelMenu(
      this,
      (a) => {
        this.setPaused(null);
        audio.sfx('pray');
        fx.flash(this.cameras.main, 300, 246, 227, 163);
        this.goTo({ room: a.room, checkpoint: a.id, keepHealth: true });
      },
      () => this.setPaused(null),
    );
    this.options = new OptionsMenu(this, () => this.setPaused('pause'), () => this.setPaused('touch'));
    this.layoutEditor = new TouchLayoutEditor(
      this,
      controls as TouchLayout,
      (stick, buttons) => {
        settings.change({ touch: { stick, buttons } });
        this.touch.relayout(touchLayoutFrom(controls as TouchLayout, settings.current));
        this.setPaused('options');
      },
      () => {
        settings.change({ touch: { buttons: {} } });
        this.touch.relayout(touchLayoutFrom(controls as TouchLayout, settings.current));
        this.setPaused('options');
      },
    );
    new CornerButtons(this, () => this.setPaused(this.map.open ? null : 'map'), () => this.setPaused(this.pauseMenu.open ? null : 'pause'));
    // Test mode only: ?test&trailer hides the HUD, touch controls and corner buttons (clean footage for the montage);
    // ?test&zoom=2 frames the action closer (integer zoom keeps the pixels square).
    if (testHookEnabled()) {
      const q = new URLSearchParams(location.search);
      if (q.has('trailer')) this.time.delayedCall(0, () => {
        this.touch.forceHidden = true;
        this.touch.setVisible(false);
        for (const o of this.children.list) {
          const any = o as unknown as { scrollFactorX?: number; depth?: number; setVisible?: (v: boolean) => void };
          const d = any.depth ?? 0;
          if (any.scrollFactorX === 0 && ((d >= 900 && d < 1050) || d >= 1600)) any.setVisible?.(false);
        }
      });
      const zoom = Number(q.get('zoom'));
      if (Number.isInteger(zoom) && zoom > 1) this.cameras.main.setZoom(zoom);
    }
    this.input.keyboard?.on('keydown-M', () => this.setPaused(this.map.open ? null : 'map'));
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.layoutEditor.open) return;
      if (this.travel.open) return this.setPaused(null);
      if (this.options.open) this.options.escape();
      else if (this.codex.open) this.codex.close();
      else this.setPaused(this.pauseMenu.open || this.map.open ? null : 'pause');
    });
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
    this.touch = new TouchControls(this, touchLayoutFrom(controls as TouchLayout, settings.current));
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

  /** Methuselah blood a target gives (an enemy's 'blood', or a Methuselah boss's), or null for humans and puppets. */
  private bloodOf(id: number): { hit: number; kill: number } | null {
    const e = this.enemies.active.find((en) => en.id === id);
    if (e) return e.cfg.blood ?? null;
    const boss = this.roomData.boss;
    if (boss && this.arena?.fighter.id === id) return bossBlood(boss.id);
    return null;
  }

  /** Hit feedback listens to events; combat code never calls effects directly. */
  private wireFeedback(): void {
    this.bus.on('combat:hit', ({ targetId, byPlayer }) => {
      // Blood for the Crusnik meter: only Methuselah bleed it (owner's rule).
      if (byPlayer) this.player.crusnik.gain(this.bloodOf(targetId)?.hit ?? 0);
    });
    this.bus.on('enemy:died', ({ id }) => {
      this.player.crusnik.gain(this.bloodOf(id)?.kill ?? 0);
      // The Bestiary: the first kill of a kind writes its page.
      const type = this.enemies.active.find((en) => en.id === id)?.cfg.type ?? this.flyers.typeOf(id);
      if (type) gameState.setFlag(beastFlag(type));
      audio.sfx('death');
    });
    this.bus.on('combat:parry', ({ x, y }) => {
      // Steel on steel: a sharp freeze, white sparks, a short shake.
      audio.sfx('parry');
      this.hitStop.trigger(effects.parryHitstopMs);
      if (this.hitStop.active) this.physics.world.pause();
      if (fx.sparksOn) this.sparks.burst(x, y, effects.sparksPerHit * 2, this.player.facing);
      if (fx.shakeOn) fx.shake(this.cameras.main, 90, 0.004);
      fx.flash(this.cameras.main, 60, 255, 245, 220);
    });
    this.bus.on('combat:hit', ({ x, y, hit, byPlayer }) => {
      audio.sfx(byPlayer ? 'hit' : 'hurt');
      this.hitStop.trigger(hit.hitstopMs);
      // Pause now: physics steps before the next scene update, so waiting would let one frame of knockback through.
      if (this.hitStop.active) this.physics.world.pause();
      if (fx.shakeOn && hit.shakeMs > 0) fx.shake(this.cameras.main, hit.shakeMs, hit.shakeIntensity);
      if (fx.sparksOn) this.sparks.burst(x, y, effects.sparksPerHit, Math.sign(hit.knockbackX));
    });
    this.bus.on('combat:finisher', (f) => {
      this.hitStop.trigger(f.hitstopMs);
      if (this.hitStop.active) this.physics.world.pause();
      if (fx.shakeOn && f.shakeMs > 0) fx.shake(this.cameras.main, f.shakeMs, f.shakeIntensity);
      audio.sfx(f.finisher === 'revolver' ? 'gunshot' : 'hit');
      if (f.finisher === 'revolver') this.shotFlash.fire(f.fromX, f.fromY, f.x, f.y);
      if (f.finisher === 'bloodDrain') this.player.crusnik.feed(crusnikConfig.gainPerDrain);
      if (fx.sparksOn) this.sparks.burst(f.x, f.y, effects.shotSparks, f.direction);
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
    audio.music(musicFor({ room: this.roomData.id, boss: this.arena?.active ? this.roomData.boss?.id : null, cutscene: this.cutsceneId }));
    if (this.cutsceneOn) return;
    if (this.map.open || this.pauseMenu.open || this.codex.open || this.options.open || this.layoutEditor.open || this.travel.open) {
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
    this.updateCheat();

    this.backdrop.update(dt);
    this.senseLadders();
    this.player.update(dt);
    this.listen();
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
      [...this.dummies, ...(arena?.hazards(p0.hurtbox()) ?? []), ...this.flyers.hazards(p0.hurtbox(), p0.x, p0.y), ...this.enemies.boltHazards(p0.hurtbox())],
    );
    this.sparks.update(dt);
    this.shotFlash.update(dt);
    this.boltFx.clear();
    for (const b of this.enemies.bolts) {
      this.boltFx.lineStyle(2, 0x8a6a3a, 1).lineBetween(b.x - Math.sign(b.vx) * 8, b.y, b.x, b.y);
      this.boltFx.fillStyle(0xddd7e6, 1).fillRect(b.x - 1, b.y - 1, 2, 2);
    }
    const p = this.player;
    this.hud.setCrusnik(p.crusnik.fraction, p.crusnik.shown, p.crusnik.ready);
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

  private readonly cheatCode = new CheatCode();
  /** Wings given by the cheat (not the final battle's), taken back when it is switched off. */
  private cheatWings = false;

  /** ↑ ↓ ← → ATK DODGE toggles the owner's cheat: no damage, endless holy water, a full blood meter, and ABIL
   * takes the 80% winged form. */
  private updateCheat(): void {
    const a = this.actions;
    if (this.cheatCode.frame(this.time.now, a.moveX, a.moveY, a.justPressed('attack'), a.justPressed('dodge'))) {
      cheat.on = !cheat.on;
      this.banner.show(cheat.on ? 'BLESSED' : 'MORTAL', cheat.on ? 'Cheat on: no damage, endless holy water, ABIL for the eighty percent form.' : 'Cheat off.', 1800);
      audio.sfx('card');
    }
    const p = this.player;
    const cm = p.crusnik;
    p.godMode = cheat.on;
    if (cheat.on) {
      cm.awake = true;
      cm.unlocked = true;
      cm.fill();
      if (p.form === 'crusnik' && !p.winged) {
        p.winged = true;
        this.cheatWings = true;
      }
      return;
    }
    if (this.cheatWings) {
      p.winged = false;
      this.cheatWings = false;
    }
    cm.awake = gameState.hasFlag(crusnikConfig.meterFlag);
    cm.unlocked = cm.unlocked && (gameState.hasFlag(crusnikConfig.unlockFlag) || p.winged);
  }

  /** Exits, spikes and altars. */
  private updateRoom(): void {
    const p = this.player;
    if (!p.kneeling) this.prayArmed = true;
    const lurking = revealedInteriors(this.enemies.alive, p.x, p.y, (x, y) => this.tiles.interiorAt(x, y));
    this.tiles.update(this.game.loop.delta, p.x, p.y, p.feetY, lurking);
    this.runtime.updateLandmarks(this.game.loop.delta, p.x, p.feetY);
    p.onOneway = p.onGround && this.standingOnOneway();
    if (this.crossEdge()) return;
    const lore = p.onGround ? this.runtime.loreAt(p.x) : null;
    this.lorePanel.show(lore);
    this.pickups.update(this.game.loop.delta);
    const found = this.pickups.take(p.x, p.y);
    if (found) this.collect(found);
    if (lore) {
      gameState.setFlag(`lore:${lore}`);
      const unlock = loreEntry(lore)?.unlocks;
      if (unlock && !gameState.hasFlag(unlock)) this.unlock(unlock);
    }
    this.doorHint.setVisible(false);
    // Fast travel: at an altar of an open area, with somewhere to go, push up.
    const altar = p.onGround && !p.kneeling ? this.runtime.altarAt(p.x, p.feetY) : null;
    if (altar) {
      const dest = destinations(this.roomData.id, altar, (f) => gameState.hasFlag(f));
      if (dest.length && gameState.altarUsed(this.roomData.id, altar)) {
        const c = this.roomData.checkpoints.find((cp) => cp.id === altar)!;
        this.doorHint.setText('travel ▲').setPosition(c.x, c.y - 44).setVisible(true);
        if (this.actions.moveY < -0.5 && this.travelReady) {
          this.travelReady = false;
          this.setPaused('travel');
          this.travel.show(dest);
          return;
        }
      }
    }
    if (this.actions.moveY > -0.3) this.travelReady = true;
    const ev = this.runtime.update(p);
    if (!ev) return;
    if (ev.type === 'exit') {
      const ex = ev.exit;
      if (ex.requires && !gameState.hasFlag(ex.requires)) {
        this.doorHint.setText('sealed').setPosition(ex.x + ex.w / 2, ex.y - 4).setVisible(true);
      } else if (ex.door && this.actions.moveY > -0.5) {
        this.doorHint.setText('▲').setPosition(ex.x + ex.w / 2, ex.y - 4).setVisible(true);
      } else {
        if (ex.door) audio.sfx('door');
        this.goTo({ room: ex.to, entry: ex.entry });
      }
      return;
    } else if (ev.type === 'hazard') {
      // Spikes and water hurt, then send you back to the last altar you prayed at (owner's rule).
      if (!p.invulnerable) {
        p.takeHit({ damage: ev.damage, knockbackX: 0, knockbackY: 0, hitstopMs: 0, shakeMs: 120, shakeIntensity: 0.006 });
        this.bus.emit('player:hurt', { hp: p.health.hp, max: p.health.max });
        if (p.health.dead) {
          this.bus.emit('player:died', {});
          return;
        }
      }
      const cp = gameState.checkpoint;
      audio.sfx('hurt');
      this.goTo(cp ? { room: cp.room, checkpoint: cp.id, keepHealth: true } : { room: START.room, entry: START.entry, keepHealth: true });
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

  /** Sounds driven by state changes: a new swing, a dodge or slide, a crossbow bolt loosed. */
  private listen(): void {
    const p = this.player;
    const h = this.heard;
    const attack = p.combat.current;
    if (attack && attack !== h.attack) audio.sfx('swing');
    if (p.state !== h.state && (p.state === 'dodge' || p.state === 'slide')) audio.sfx('dodge');
    const bolts = this.enemies.bolts.length;
    if (bolts > h.bolts) audio.sfx('bolt');
    this.heard = { state: p.state, attack, bolts };
  }

  /** Kneel at an altar: a beam of light, the dove of the Holy Spirit descends over Abel, then rest. */
  private startPrayer(checkpoint: string): void {
    const p = this.player;
    this.praying = { ms: 0, checkpoint };
    audio.sfx('pray');
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
    fx.flash(this.cameras.main, 250, 246, 227, 163);
    this.goTo({ room: this.roomData.id, checkpoint: pr.checkpoint });
  }

  /** The boss fell and her last words are done: open the way on and save. */
  /** A boss fell (or yielded) and the outro played: open the way, grant the relic, show the Latin card, save. */
  /** A hidden item picked up: its gift (health, a flask, a weapon), its card, the tea set, and a save. */
  private collect(id: string): void {
    const def = items[id];
    if (!def) return;
    gameState.setFlag(itemFlag(id));
    const before = this.player.health.max;
    const stats = playerStats((f) => gameState.hasFlag(f));
    this.player.applyStats(stats);
    this.player.health.heal(this.player.health.max - before);
    this.player.flasks = Math.min(stats.flasks, this.player.flasks + (def.flasks ?? 0));
    if (def.weapon) {
      for (const w of ownedWeapons((f) => gameState.hasFlag(f))) gameState.clearFlag(`weapon:${w}`);
      gameState.setFlag(`weapon:${def.weapon}`);
      this.player.weapon = def.weapon;
    }
    this.hud.setMaxFlasks(stats.flasks);
    this.hud.setFlasks(this.player.flasks);
    this.hud.setHealth(this.player.health.fraction);
    this.banner.show(def.name.toUpperCase(), def.text + (def.weapon ? '\nPause to switch weapons.' : ''), 3400);
    audio.sfx('card');
    if (def.set && setComplete(def.set, (f) => gameState.hasFlag(f))) {
      const set = itemSets[def.set];
      if (set) {
        const bonus = playerStats((f) => gameState.hasFlag(f));
        this.player.flasks = Math.min(bonus.flasks, this.player.flasks + (set.flasks ?? 0));
        this.hud.setFlasks(this.player.flasks);
        this.time.delayedCall(3600, () => this.banner.show(set.name.toUpperCase(), set.text, 3600));
      }
    }
    saveStore.save(gameState.toSave(Date.now()));
  }

  private bossDefeated(flag: string, relicId: string): void {
    if (this.roomData.boss) gameState.setFlag(beastFlag(this.roomData.boss.id));
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
    audio.sfx('card');
    if (flag === crusnikConfig.meterFlag && !this.player.crusnik.awake) {
      // After the first mini boss: the blood meter wakes, and with it the forty percent form (owner rule).
      gameState.setFlag(flag);
      this.player.crusnik.awake = true;
      this.player.crusnik.unlocked = gameState.hasFlag(crusnikConfig.unlockFlag);
      this.time.delayedCall(3400, () => this.banner.show('SANGUIS', 'The bar under your health is blood. Only Methuselah blood fills it.\nWhen it is full and glows, press ABIL to become the Crusnik.', 3200));
    }
    if (flag === 'gyula_defeated') {
      // The end: the ending scene, the credits, then the teaser for the next arc.
      saveStore.save(gameState.toSave(Date.now()));
      this.time.delayedCall(3200, () =>
        this.playCutscene('ending', () => {
          this.scene.start(SCENES.credits);
        }),
      );
      return;
    }
    saveStore.save(gameState.toSave(Date.now()));
  }

  private cutsceneOn = false;
  private cutsceneId: string | null = null;
  /** Last seen player state, attack and bolt count: their changes trigger sounds. */
  private heard: { state: string; attack: unknown; bolts: number } = { state: '', attack: null, bolts: 0 };

  /** Plays a cutscene over the game; gameplay waits until it ends. */
  private playCutscene(id: string, done: () => void): void {
    if (!cutscene(id)) {
      done();
      return;
    }
    this.cutsceneOn = true;
    this.cutsceneId = id;
    this.touch.releaseAll();
    this.physics.world.pause();
    this.game.events.once(`cutscene-done:${id}`, () => {
      this.cutsceneOn = false;
      this.cutsceneId = null;
      this.physics.world.resume();
      done();
    });
    this.scene.launch(SCENES.cutscene, { id });
    this.scene.bringToTop(SCENES.cutscene);
  }

  /** A boss's mid-fight cutscene ended. Kampfer's is Abel's first transformation: the Crusnik wakes, now. */
  private phaseSceneDone(id: string): void {
    if (id === 'gyula_wings') {
      // The final battle: eighty percent. Wings, and the blood no longer runs out.
      gameState.setFlag(crusnikConfig.unlockFlag);
      this.player.crusnik.unlocked = true;
      this.player.forceTransform();
      this.player.winged = true;
      this.banner.show('OCTOGINTA', 'Eighty percent. Wings — leap and glide.', 2400);
      return;
    }
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
    fx.flash(this.cameras.main, 400, 140, 20, 40);
    if (fx.shakeOn) fx.shake(this.cameras.main, 350, 0.01);
    this.banner.show('THE CRUSNIK STIRS', 'When the blue bar beneath your health glows, press ABIL to transform.\nAs the Crusnik: ATK scythe, ABIL chain lash, a far higher leap.');
    saveStore.save(gameState.toSave(Date.now()));
  }

  /** Open the map, the pause menu or the Codex (gameplay and physics stop), or close them all (null). */
  private setPaused(what: 'map' | 'pause' | 'codex' | 'options' | 'touch' | 'travel' | null): void {
    if (what !== 'travel') this.travel.hide();
    this.map.hide();
    this.pauseMenu.hide();
    this.codex.hide();
    this.options.hide();
    this.layoutEditor.hide();
    this.touch.setVisible(what !== 'touch');
    if (what === 'codex') this.codex.show();
    if (what === 'options') this.options.show();
    if (what === 'touch') this.layoutEditor.show(this.touch.currentLayout);
    if (what === 'map') this.map.show(allRooms, (id) => gameState.hasVisited(id), (room, id) => gameState.altarUsed(room, id), this.roomData, this.player.x, this.player.y, (rm) => (gameState.hasVisited(rm.id) ? rm.items.filter((i) => !gameState.hasFlag(itemFlag(i.id))).length : 0));
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
    // Walking between rooms (or a fall back to the altar) keeps your health; praying or dying refills it.
    const carry = (next.checkpoint === undefined || next.keepHealth === true) && !this.player.health.dead;
    gameState.hp = carry ? this.player.health.hp : null;
    // Flasks carry over too; praying and dying refill them.
    gameState.flasks = carry ? this.player.flasks : null;
    // The blood meter carries over; praying or dying ends the form (the blood stays).
    const blood = this.player.crusnik.snapshot();
    gameState.crusnik = carry ? blood : { value: blood.value, active: false };
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
      paused: this.pauseMenu.open ? "pause" : this.map.open ? "map" : this.codex.open ? "codex" : this.options.open ? "options" : this.layoutEditor.open ? "touch" : this.travel.open ? "travel" : null,
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
        crusnikReady: p.crusnik.ready,
        winged: p.winged,
        cheat: cheat.on,
        maxHp: p.health.max,
        flasks: p.flasks,
        weapon: p.weapon,
        strength: p.damageMultiplier,
        // For playtest bots: is there no floor a short way ahead (a pit or hole)?
        gapAhead: !this.roomData.solids.concat(this.roomData.oneways).some((g) => {
          const ax = p.x + p.facing * 22;
          return ax >= g.x && ax <= g.x + g.w && p.feetY + 2 >= g.y && p.feetY + 2 <= g.y + g.h;
        }),
      },
      music: audio.current,
      cutscene: this.cutsceneId,
      items: this.pickups.remaining,
      enemies: this.enemies.active.map((e) => ({ type: e.cfg.type, state: e.state, view: e.viewLabel, x: e.x, y: e.y, hp: e.health.hp })),
      dummies: this.dummies.map((d) => ({ x: d.x, hp: d.health.hp, alive: d.alive })),
      boss: this.arena
        ? { state: this.arena.fighter.stateLabel, hp: this.arena.fighter.healthFraction, phase: this.arena.fighter.phaseNumber, x: this.arena.fighter.x, active: this.arena.active, cutscene: this.cutsceneOn }
        : null,
    };
  }
}
