import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import type { ActionState } from '../systems/input/ActionState';
import tuning from '../data/player.json';
import { StateMachine } from './StateMachine';
import { playerStates, type PlayerContext, type PlayerStateKey } from './playerStates';

/** Placeholder player: a rectangle with an Arcade body driven by the player state machine. */
export class Player implements PlayerContext {
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  private readonly fsm: StateMachine<PlayerStateKey, PlayerContext>;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly input: ActionState,
  ) {
    this.sprite = scene.add.rectangle(x, y, tuning.width, tuning.height, COLORS.player);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocityY(tuning.maxFallSpeed);
    this.fsm = new StateMachine(playerStates, 'idle', this);
  }

  get state(): PlayerStateKey {
    return this.fsm.current;
  }

  get onGround(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  get velocityY(): number {
    return this.body.velocity.y;
  }

  get moveX(): number {
    return this.input.moveX;
  }

  get jumpPressed(): boolean {
    return this.input.justPressed('jump');
  }

  move(): void {
    this.body.setVelocityX(this.input.moveX * tuning.runSpeed);
  }

  jump(): void {
    this.body.setVelocityY(-tuning.jumpVelocity);
  }

  update(dtMs: number): void {
    this.fsm.update(dtMs);
  }
}
