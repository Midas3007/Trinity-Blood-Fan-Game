import { describe, expect, it } from 'vitest';
import { destinations, travelAltars } from '../src/world/fastTravel';
import { rooms } from '../src/world/rooms';

describe('fast travel', () => {
  it('lists every altar in the world, and only real ones', () => {
    const all = Object.values(rooms).flatMap((r) => r.checkpoints.map((c) => `${r.id}:${c.id}`));
    expect(travelAltars.map((a) => `${a.room}:${a.id}`).sort()).toEqual(all.sort());
  });
  it('opens an area only after the boss beyond it, and only to altars prayed at', () => {
    const flags = new Set(['altar:market_square:fountain_altar', 'altar:market_square:tavern_altar', 'altar:chapel_of_bones:chapel_altar']);
    const has = (f: string): boolean => flags.has(f);
    expect(destinations('market_square', 'fountain_altar', has)).toEqual([]);
    flags.add('paula_defeated');
    expect(destinations('market_square', 'fountain_altar', has).map((a) => a.id)).toEqual(['tavern_altar']);
    flags.add('petros_defeated');
    expect(destinations('market_square', 'fountain_altar', has).map((a) => a.id)).toEqual(['tavern_altar', 'chapel_altar']);
    expect(destinations('cathedral_nave', 'nave_altar', has)).toEqual([]);
  });
});
