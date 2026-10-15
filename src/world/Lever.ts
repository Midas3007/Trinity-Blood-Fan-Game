import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import { nextEntityId } from '../combat/ids';
import type { Damageable, HitInfo, Rect } from '../combat/types';

const POST_W = 4;
const POST_H = 18;
const HANDLE_LEN = 12;
const HIT_W = 14;

/** A wall lever: strike it to throw it (sets a flag that opens gates). Hittable like an enemy. */
export class Lever implements Damageable {
  readonly id = nextEntityId();
  private readonly handle: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    readonly x: number,
    private readonly feetY: number,
    private thrown: boolean,
    private readonly onThrow: () => void,
  ) {
    scene.add.rectangle(x, feetY - POST_H / 2, POST_W, POST_H, COLORS.stone);
    this.handle = scene.add.rectangle(x, feetY - POST_H, 2, HANDLE_LEN, COLORS.spark).setOrigin(0.5, 1);
    this.setAngle();
  }

  get alive(): boolean {
    return !this.thrown;
  }

  hurtbox(): Rect {
    return { x: this.x - HIT_W / 2, y: this.feetY - POST_H - HANDLE_LEN, w: HIT_W, h: POST_H + HANDLE_LEN };
  }

  receiveHit(_hit: HitInfo): boolean {
    if (this.thrown) return false;
    this.thrown = true;
    this.setAngle();
    this.onThrow();
    return true;
  }

  private setAngle(): void {
    this.handle.setAngle(this.thrown ? 50 : -50);
  }
}
