import Phaser from 'phaser';
import { TITLE_ART_KEY } from '../constants';
import { TILESET_KEY } from '../../world/RoomTiles';
import tileDefs from '../../data/tiles.json';
import { SCENES } from '../constants';
import { sheetLoads, SPRITES_BASE, type SpriteIndex } from '../../systems/sprites/spriteIndex';
import { createAnims, SPRITE_INDEX_KEY as INDEX_KEY } from '../../systems/sprites/lateLoad';

/** Loads the sprite index written by tools/spritegen, then every sheet it lists, and creates the animations.
 * If anything is missing the game still runs with placeholder shapes. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload(): void {
    this.load.json(INDEX_KEY, `${SPRITES_BASE}index.json`);
    this.load.image(TILESET_KEY, tileDefs.image);
    this.load.image('altar', 'assets/props/altar.png');
    this.load.image('portrait', 'assets/ui/portrait.png');
    this.load.image('cathedral_front', 'assets/props/cathedral_front.png');
    this.load.spritesheet('dove', 'assets/props/dove.png', { frameWidth: 16, frameHeight: 12 });
    // Title key art (palette-locked painting, tools/spritegen keyart). Missing file = plain text title.
    this.load.image(TITLE_ART_KEY, 'assets/ui/title.png');
    this.load.once(`filecomplete-json-${INDEX_KEY}`, (_key: string, _type: string, data: SpriteIndex) => {
      for (const s of sheetLoads(data)) {
        this.load.spritesheet(s.key, s.url, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
      }
    });
  }

  create(): void {
    if (this.textures.exists('dove')) this.anims.create({ key: 'dove_fly', frames: this.anims.generateFrameNumbers('dove', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
    const index = this.cache.json.get(INDEX_KEY) as SpriteIndex | undefined;
    // A sheet that failed to download (a dropped request on a phone) would leave that sprite a plain block for the
    // whole session: ask for the missing ones once more, past the offline cache, before starting.
    const missing = index ? sheetLoads(index).filter((s) => !this.textures.exists(s.key)) : [];
    if (missing.length > 0) {
      for (const s of missing) this.load.spritesheet(s.key, `${s.url}?retry=${Date.now()}`, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
      this.load.once(Phaser.Loader.Events.COMPLETE, () => this.finish(index));
      this.load.start();
      return;
    }
    this.finish(index);
  }

  private finish(index: SpriteIndex | undefined): void {
    if (index) createAnims(this, index);
    this.scene.start(SCENES.menu);
  }
}
