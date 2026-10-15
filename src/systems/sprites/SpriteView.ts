import Phaser from 'phaser';

/** Which animation a state shows. `frame` freezes one frame; `timeScale` speeds the animation up or down. */
export interface StateVisual {
  anim: string;
  frame?: number;
  timeScale?: number;
}

/**
 * Draws a character's sprite at its physics body's feet. The physics body stays the source of truth for
 * collision; this only follows it. Used by the player and enemies. When there is no art for a state (or the
 * sheets failed to load) `show` returns false and the caller shows its placeholder instead.
 */
export class SpriteView {
  readonly sprite: Phaser.GameObjects.Sprite | null;
  private current = '';

  constructor(
    private readonly scene: Phaser.Scene,
    firstAnim: string | null,
    depth: number,
  ) {
    const ready = firstAnim !== null && scene.anims.exists(firstAnim);
    this.sprite = ready ? scene.add.sprite(0, 0, '').setOrigin(0.5, 1).setDepth(depth).setVisible(false) : null;
  }

  /** Current animation/frame label, for the debug overlay and the test hook. */
  get label(): string {
    return this.sprite?.visible ? this.current : 'placeholder';
  }

  hide(): void {
    this.sprite?.setVisible(false);
    this.current = '';
  }

  /** Shows `v` at the feet position; returns false (and hides the sprite) when there is no art for it. */
  show(v: StateVisual | null, feetX: number, feetY: number, facing: 1 | -1, alpha: number): boolean {
    if (!this.sprite) return false;
    const showArt = v !== null && this.scene.anims.exists(v.anim);
    this.sprite.setVisible(showArt);
    if (!showArt || !v) {
      this.current = '';
      return false;
    }
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
    this.sprite.anims.timeScale = v.timeScale ?? 1;
    // Whole-pixel position keeps the pixel art crisp; mirroring (not rotation) for facing.
    this.sprite.setPosition(Math.round(feetX), Math.round(feetY)).setFlipX(facing < 0).setAlpha(alpha);
    return true;
  }
}
