import { describe, expect, it } from 'vitest';
import { gameProgress, STORY_FLAGS } from '../src/systems/gameProgress';
import { rooms } from '../src/world/rooms';
import { items } from '../src/systems/items';

describe('title-screen progress', () => {
  it('is 0 for no save, grows with fights, rooms, items and lore, and caps at 1', () => {
    expect(gameProgress(null)).toBe(0);
    const start = gameProgress({ flags: [], visited: ['istvan_station'] });
    expect(start).toBeGreaterThan(0);
    expect(start).toBeLessThan(0.05);
    const oneBoss = gameProgress({ flags: ['paula_defeated'], visited: ['istvan_station'] });
    expect(oneBoss).toBeGreaterThan(start + 0.1);
    const noItems = gameProgress({ flags: [...STORY_FLAGS, 'lore:ax_orders'], visited: Object.keys(rooms) });
    const all = gameProgress({ flags: [...STORY_FLAGS, 'lore:ax_orders', ...Object.keys(items).map((i) => `item:${i}`)], visited: Object.keys(rooms) });
    expect(all).toBeGreaterThan(noItems + 0.09); // hidden items count too
    expect(all).toBeGreaterThan(0.9);
    expect(all).toBeLessThanOrEqual(1);
  });
});
