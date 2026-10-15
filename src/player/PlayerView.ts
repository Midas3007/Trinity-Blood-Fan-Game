import Phaser from 'phaser';
import mapping from '../data/playerAnimations.json';
import type { PlayerStateKey } from './playerStates';

export interface StateVisual {
  anim: string;
  frame?: number;
}

const states = mapping.states as Record<PlayerStateKey, StateVisual | null>;

/** The visual for a state, or null for "show the placeholder". Pure; exported for tests. */
export function visualFor(state: PlayerStateKey): StateVisual | null {
  return states[state] ?? null;
}

/**
 * Draws the player's sprite at the physics body's feet. The physics body (a plain rectangle) stays the
 * source of truth for collision; this only follows it. Falls back to the placeholder rectangle when a state
 * has no art yet, or when the sprite sheets failed to load.
 */
export class PlayerView {
  private readonly sprite: Phaser.GameObjects.Sprite | null;
  private current = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly placeholder: Phaser.GameObjects.Rectangle,
    private readonly facingMark: Phaser.GameObjects.Rectangle,
  ) {
    const first = visualFor('idle');
    const ready = first !== null && scene.anims.exists(first.anim);
    this.sprite = ready ? scene.add.sprite(placeholder.x, placeholder.y, '').setOrigin(0.5, 1).setDepth(10) : null;
  }

  get hasArt(): boolean {
    return this.sprite !== null;
  }

  /** Current animation/frame label, for the debug overlay. */
  get label(): string {
    return this.sprite?.visible ? this.current : 'placeholder';
  }

  update(state: PlayerStateKey, feetX: number, feetY: number, facing: 1 | -1, alpha: number): void {
    const v = this.sprite ? visualFor(state) : null;
    const showArt = this.sprite !== null && v !== null && this.scene.anims.exists(v.anim);
    this.placeholder.setVisible(!showArt);
    this.facingMark.setVisible(!showArt);
    if (!this.sprite) return;
    this.sprite.setVisible(showArt);
    if (!showArt || !v) return;

    const label = v.frame === undefined ? v.anim : `${v.anim}#${v.frame}`;
    if (label !== this.current) {
      this.current = label;
      if (v.frame === undefined) {
        this.sprite.play(v.anim, true);
      } else {
        this.sprite.anims.stop();
        const anim = this.scene.anims.get(v.anim);
        const f = anim.frames[Math.min(v.frame, anim.frames.length - 1)];
        if (f) this.sprite.setTexture(f.textureKey, f.textureFrame);
      }
    }
    // Whole-pixel position keeps the pixel art crisp; mirroring (not rotation) for facing.
    this.sprite.setPosition(Math.round(feetX), Math.round(feetY)).setFlipX(facing < 0).setAlpha(alpha);
  }
}
