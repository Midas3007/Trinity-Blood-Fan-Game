import { describe, expect, it } from 'vitest';
import { beastFlag, beasts, codexCount, codexItems, page, pageCount } from '../src/ui/codexData';
import { enemyConfigs } from '../src/enemies/enemyConfig';
import { flyerConfigs } from '../src/enemies/flyers/FlyerBrain';
import { rooms } from '../src/world/rooms';
import { animDefs, type SpriteIndex } from '../src/systems/sprites/spriteIndex';
import index from '../public/assets/sprites/index.json';

describe('Codex: Bestiary and Lore book', () => {
  it('every enemy, flyer and boss has a bestiary page with a real portrait', () => {
    const anims = new Set(animDefs(index as SpriteIndex).map((a) => a.key));
    const ids = [...Object.keys(enemyConfigs), ...Object.keys(flyerConfigs), ...Object.values(rooms).flatMap((r) => (r.boss ? [r.boss.id] : []))];
    for (const id of ids) {
      expect(beasts[id], id).toBeDefined();
      expect(anims.has(beasts[id]!.anim), beasts[id]!.anim).toBe(true);
    }
  });
  it('pages unlock by flag and keep their place while locked', () => {
    const flags = new Set([beastFlag('thrall'), 'lore:ax_orders']);
    const has = (f: string): boolean => flags.has(f);
    const b = codexItems('bestiary', has);
    expect(b.find((i) => i.id === 'thrall')?.unlocked).toBe(true);
    expect(b.find((i) => i.id === 'gyula')?.unlocked).toBe(false);
    expect(codexCount('bestiary', has)).toEqual({ found: 1, total: b.length });
    expect(codexCount('lore', has).found).toBe(1);
  });
  it('pages split the list', () => {
    expect(page([1, 2, 3, 4, 5], 1, 2)).toEqual([3, 4]);
    expect(pageCount(19, 9)).toBe(3);
    expect(pageCount(0, 9)).toBe(1);
  });
});
