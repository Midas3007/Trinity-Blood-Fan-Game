import Phaser from 'phaser';
import { animDefs, sheetLoads, type SpriteIndex } from './spriteIndex';

/** Cache key of the sprite index (loaded by BootScene). */
export const SPRITE_INDEX_KEY = 'spriteIndex';

/** Creates every animation whose sheet is loaded and that does not exist yet. */
export function createAnims(scene: Phaser.Scene, index: SpriteIndex): void {
  for (const a of animDefs(index)) {
    if (!scene.textures.exists(a.texture) || scene.anims.exists(a.key)) continue;
    scene.anims.create({ key: a.key, frames: a.frames.map((f) => ({ key: a.texture, frame: f.frame, duration: f.duration })), repeat: a.repeat });
  }
}

/**
 * Queues the sheets behind these animation keys (an entity prefix such as "boss_cain_", or '*' for all) that
 * failed to load at boot: a dropped download on a phone must not leave a boss a plain block for the whole session.
 * Returns how many were queued; call `createAnims` once the loader completes.
 */
export function queueMissing(scene: Phaser.Scene, wanted: string[]): number {
  const index = scene.cache.json.get(SPRITE_INDEX_KEY) as SpriteIndex | undefined;
  if (!index) return 0;
  const sheets = new Set(animDefs(index).filter((a) => wanted.some((w) => w === '*' || a.key === w || (w.endsWith('_') && a.key.startsWith(w)))).map((a) => a.texture));
  let n = 0;
  for (const s of sheetLoads(index)) {
    if (!sheets.has(s.key) || scene.textures.exists(s.key)) continue;
    scene.load.spritesheet(s.key, `${s.url}?late=${Date.now()}`, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
    n++;
  }
  return n;
}

/** Loads any missing sheets for these animations now (outside preload), then creates their animations. */
export function ensureSprites(scene: Phaser.Scene, wanted: string[], done?: () => void): void {
  if (queueMissing(scene, wanted) === 0) {
    done?.();
    return;
  }
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    const index = scene.cache.json.get(SPRITE_INDEX_KEY) as SpriteIndex | undefined;
    if (index) createAnims(scene, index);
    done?.();
  });
  scene.load.start();
}
