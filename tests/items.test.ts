import { describe, expect, it } from 'vitest';
import { currentWeapon, itemBonus, itemFlag, items, ownedWeapons, setComplete, setItems } from '../src/systems/items';
import { playerStats } from '../src/systems/progression';
import { rooms } from '../src/world/rooms';
import { overlaps } from '../src/combat/geometry';

describe('hidden items', () => {
  it('every item is placed exactly once, in open space', () => {
    const placed = Object.values(rooms).flatMap((r) => r.items.map((i) => ({ ...i, room: r })));
    for (const id of Object.keys(items)) expect(placed.filter((p) => p.id === id).length, id).toBe(1);
    for (const p of placed) {
      expect(items[p.id], p.id).toBeDefined();
      const box = { x: p.x - 4, y: p.y - 20, w: 8, h: 16 };
      expect(p.room.solids.some((s) => overlaps(s, box)), `${p.id} inside a wall in ${p.room.id}`).toBe(false);
    }
  });
  it('hearts add health, chalices flasks, the tea set its bonus', () => {
    const flags = new Set<string>();
    const has = (f: string): boolean => flags.has(f);
    const base = playerStats(has);
    flags.add(itemFlag('heart1'));
    flags.add(itemFlag('chalice1'));
    expect(playerStats(has).maxHealth).toBe(base.maxHealth + 10);
    expect(playerStats(has).flasks).toBe(base.flasks + 1);
    const tea = setItems('tea');
    expect(tea.length).toBe(6);
    for (const id of tea.slice(0, 5)) flags.add(itemFlag(id));
    expect(setComplete('tea', has)).toBe(false);
    flags.add(itemFlag(tea[5]!));
    expect(setComplete('tea', has)).toBe(true);
    expect(itemBonus(has).damage).toBeGreaterThan(0);
  });
  it('the sword is carried once found, and the chosen weapon sticks', () => {
    const flags = new Set<string>();
    const has = (f: string): boolean => flags.has(f);
    expect(ownedWeapons(has)).toEqual(['fists']);
    expect(currentWeapon(has)).toBe('fists');
    flags.add(itemFlag('sword'));
    expect(currentWeapon(has)).toBe('sword');
    flags.add('weapon:fists');
    expect(currentWeapon(has)).toBe('fists');
  });
});
