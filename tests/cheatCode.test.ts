import { describe, expect, it } from 'vitest';
import { CheatCode, CHEAT_GAP_MS } from '../src/systems/cheatCode';

/** Frames of input: a stick push then release, or a button press. */
function play(c: CheatCode, moves: string[], gapMs = 100): boolean {
  let t = 0;
  let done = false;
  const stick: Record<string, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (const m of moves) {
    t += gapMs;
    const s = stick[m];
    if (s) {
      done = c.frame(t, s[0], s[1], false, false) || done;
      done = c.frame(t + 16, 0, 0, false, false) || done;
    } else done = c.frame(t, 0, 0, m === 'attack', m === 'dodge') || done;
  }
  return done;
}

describe('cheat code', () => {
  it('↑ ↓ ← → ATK DODGE completes it; again completes it again (the toggle)', () => {
    const c = new CheatCode();
    expect(play(c, ['up', 'down', 'left', 'right', 'attack', 'dodge'])).toBe(true);
    expect(play(c, ['up', 'down', 'left', 'right', 'attack', 'dodge'])).toBe(true);
  });

  it('a wrong move or a long pause starts over; holding a direction counts once', () => {
    const c = new CheatCode();
    expect(play(c, ['up', 'down', 'right', 'left', 'attack', 'dodge'])).toBe(false);
    expect(play(c, ['up', 'down', 'left', 'right', 'attack', 'dodge'], CHEAT_GAP_MS + 1)).toBe(false);
    const held = new CheatCode();
    held.frame(0, 0, -1, false, false);
    held.frame(16, 0, -1, false, false); // still up: not a second "up"
    expect(play(held, ['down', 'left', 'right', 'attack', 'dodge'])).toBe(true);
  });
});
