import { describe, expect, it } from 'vitest';
import { cutscene, cutsceneIds, cutsceneImages } from '../src/core/cutscenes';
import { animDefs, type SpriteIndex } from '../src/systems/sprites/spriteIndex';
import index from '../public/assets/sprites/index.json';
import { rooms } from '../src/world/rooms';
import paula from '../src/data/bosses/paula.json';
import kampfer from '../src/data/bosses/kampfer.json';
import petros from '../src/data/bosses/petros.json';

const roomImages = new Set(Object.keys(import.meta.glob('../public/assets/rooms/*.png')).map((k) => k.replace('../public/assets/', '').replace('.png', '')));
const anims = new Set(animDefs(index as SpriteIndex).map((a) => a.key));
const BOOT_IMAGES = new Set(['cathedral_front', 'title', 'portrait', 'altar']);

describe('cutscenes', () => {
  it('every actor animation, background image and frame exists', () => {
    for (const id of cutsceneIds()) {
      const c = cutscene(id)!;
      for (const key of cutsceneImages(c)) {
        if (key.startsWith('rooms/')) expect(roomImages.has(key), `${id}: ${key}`).toBe(true);
        else expect(BOOT_IMAGES.has(key), `${id}: ${key}`).toBe(true);
      }
      for (const p of c.panels) {
        for (const a of p.actors ?? []) expect(anims.has(a.anim), `${id}: ${a.anim}`).toBe(true);
        expect((p.lines ?? []).every((l) => l.text.length > 0 && l.speaker.length > 0)).toBe(true);
      }
    }
  });

  it('every boss intro, outro and phase scene is written', () => {
    for (const r of Object.values(rooms)) {
      if (!r.boss) continue;
      for (const id of [r.boss.intro, r.boss.outro]) if (id) expect(cutscene(id), `${r.id}: ${id}`).toBeDefined();
    }
    for (const b of [paula, kampfer, petros] as { phaseScene?: string }[]) if (b.phaseScene) expect(cutscene(b.phaseScene)).toBeDefined();
    expect(cutscene('opening')).toBeDefined();
  });

  it('every story-scene marker in the rooms has its cutscene written', () => {
    for (const r of Object.values(rooms)) for (const sc of r.scenes) expect(cutscene(sc.id), `${r.id}: ${sc.id}`).toBeDefined();
  });
});
