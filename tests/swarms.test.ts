import { describe, expect, it } from 'vitest';
import { expandSwarms } from '../src/enemies/flyers/swarms';

describe('bat swarm', () => {
  it('one swarm marker becomes three bats round it; other markers stay', () => {
    const out = expandSwarms([{ type: 'batSwarm', x: 100, y: 50 }, { type: 'thrall', x: 10, y: 5 }], { batSwarm: { type: 'bat', count: 3, spread: 16 } });
    expect(out.map((s) => s.type)).toEqual(['bat', 'bat', 'bat', 'thrall']);
    expect(out.slice(0, 3).map((s) => s.x)).toEqual([84, 100, 116]);
  });
});
