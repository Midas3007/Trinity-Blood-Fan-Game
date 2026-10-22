import { describe, expect, it } from 'vitest';
import { roomFlags, rooms } from '../src/world/rooms';

describe('room flags', () => {
  it('having stood on the Spire opens its door from the Star of Sorrow (no one-way strand)', () => {
    expect(roomFlags((id) => id === 'imperial_spire')).toContain('arc2_open');
    expect(roomFlags(() => false)).toEqual([]);
    const door = rooms['star_chamber']!.exits.find((d) => d.to === 'imperial_spire');
    expect(door?.requires).toBe('arc2_open');
  });
});
