import Phaser from 'phaser';
import { SCENES } from '../constants';
import { animDefs, sheetLoads, SPRITES_BASE, type SpriteIndex } from '../../systems/sprites/spriteIndex';

const INDEX_KEY = 'spriteIndex';

/** Loads the sprite index written by tools/spritegen, then every sheet it lists, and creates the animations.
 * If anything is missing the game still runs with placeholder shapes. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload(): void {
    this.load.json(INDEX_KEY, `${SPRITES_BASE}index.json`);
    this.load.once(`filecomplete-json-${INDEX_KEY}`, (_key: string, _type: string, data: SpriteIndex) => {
      for (const s of sheetLoads(data)) {
        this.load.spritesheet(s.key, s.url, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
      }
    });
  }

  create(): void {
    const index = this.cache.json.get(INDEX_KEY) as SpriteIndex | undefined;
    if (index) {
      for (const a of animDefs(index)) {
        if (!this.textures.exists(a.texture) || this.anims.exists(a.key)) continue;
        this.anims.create({
          key: a.key,
          frames: a.frames.map((f) => ({ key: a.texture, frame: f.frame, duration: f.duration })),
          repeat: a.repeat,
        });
      }
    }
    this.scene.start(SCENES.menu);
  }
}
