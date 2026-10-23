import { describe, expect, it } from 'vitest';
import { rooms } from '../src/world/rooms';
import { walkProblems } from '../src/world/walkability';

/** Deliberate ability gates: the priest cannot make these on foot; the Crusnik leap can (tools/level/undercity.py). */
const ABILITY_GATES = [
  'chapel_of_bones: east edge cannot reach west edge', // the doorway at the top of the bone wall
  'marchesa_ballroom: west edge cannot reach east edge', // the same doorway, from the ballroom side
];

describe('rooms can be walked through', () => {
  it('from every entry, every exit of the room is reachable on foot (walk, jump, fall, climb)', () => {
    const problems = Object.values(rooms).flatMap((r) => walkProblems(r));
    expect(problems.filter((p) => !ABILITY_GATES.includes(p))).toEqual([]);
  });
  it('the ability gates are still gates (remove them from the list if a room changes)', () => {
    const problems = Object.values(rooms).flatMap((r) => walkProblems(r));
    for (const g of ABILITY_GATES) expect(problems).toContain(g);
  });
});
