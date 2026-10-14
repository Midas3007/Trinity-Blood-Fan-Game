import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, SCENES } from '../constants';
import { Player } from '../../player/Player';
import { ActionState } from '../../systems/input/ActionState';
import { mergeFrames } from '../../systems/input/actions';
import { GamepadSource } from '../../systems/input/GamepadSource';
import { KeyboardSource } from '../../systems/input/KeyboardSource';
import { DebugOverlay } from '../../ui/DebugOverlay';
import { TouchControls } from '../../ui/TouchControls';
import type { TouchLayout } from '../../ui/touchLayout';
import controls from '../../data/controls.json';
import testRoom from '../../data/testRoom.json';
import physics from '../../data/physics.json';

const MAX_FRAME_MS = 50;

/** Test room: a floor, a few ledges, and the placeholder player. */
export class PlayScene extends Phaser.Scene {
  private player!: Player;
  private readonly actions = new ActionState();
  private keyboard: KeyboardSource | null = null;
  private gamepad!: GamepadSource;
  private touch!: TouchControls;
  private debug!: DebugOverlay;

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

    this.keyboard = this.input.keyboard ? new KeyboardSource(this.input.keyboard, () => this.game.loop.time) : null;
    this.gamepad = new GamepadSource(this.input.gamepad);
    this.touch = new TouchControls(this, controls as TouchLayout);
    this.debug = new DebugOverlay(this, controls.debugToggle);

    // Drop held touches when the page is hidden so nothing stays "pressed" after returning.
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.touch.releaseAll, this.touch);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.touch.releaseAll, this.touch);
    });
  }

  update(_time: number, deltaMs: number): void {
    const frames = [this.touch.read(), this.gamepad.read()];
    if (this.keyboard) frames.push(this.keyboard.read());
    this.actions.update(mergeFrames(frames));

    // Clamp long frames (tab switches, hitches) so timers and states don't jump.
    this.player.update(Math.min(deltaMs, MAX_FRAME_MS));
    this.debug.update({
      state: `${this.player.state}${this.player.invulnerable ? ' INV' : ''}`,
      vel: `${this.player.vx.toFixed(0)},${this.player.vy.toFixed(0)}`,
      x: this.player.sprite.x,
      y: this.player.sprite.y,
      input: `${this.actions.moveX.toFixed(2)} ${this.actions.heldSummary()}`,
    });
  }
}
